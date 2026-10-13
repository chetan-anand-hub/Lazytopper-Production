// @vitest-environment node
/**
 * UPLOAD-SHRINK-1 PR-1 — the on-device PDF shrink never costs the grader anything it could read, and never
 * blocks an upload. Every decision is asserted through the REAL shrinkPdf with a fake PDF engine (jsdom has no
 * canvas and the node suite has no browser); the live pdf.js path is exercised by the eval harness + the preview.
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  SHRINK_BUDGET_MS,
  SHRINK_FLOOR_LONG_EDGE,
  SHRINK_FLOOR_QUALITY,
  SHRINK_RUNGS,
  SHRINK_TARGET_BYTES,
  SHRINK_TRIGGER_BYTES,
  classifyPdfBytes,
  shrinkPdf,
  type PdfDocumentHandle,
} from "./shrinkPdf";
import { PagesTooLargeError, type AssembledPdf } from "./assemblePagesPdf";
import { MAX_UPLOAD_PDF_BYTES } from "./uploadLimits";

const MB = 1024 * 1024;

/** A frozen clock by default: the suite never reads the real one (the CI clock guard), and the timeout tests pass their own. */
const run = (file: File, opts: Parameters<typeof shrinkPdf>[1] = {}) => shrinkPdf(file, { now: () => 0, ...opts });

/** A PDF-shaped file: a header naming what the bytes contain, padded to `size`. */
function pdf(size: number, marker: "scan" | "typed" | "objstm", name = "paper.pdf"): File {
  const head = new TextEncoder().encode(
    marker === "typed"
      ? "%PDF-1.4\n1 0 obj << /Type /Font /Subtype /Type1 >> endobj\n"
      : marker === "objstm"
        ? "%PDF-1.5\n1 0 obj << /Type /ObjStm >> endobj\n"
        : "%PDF-1.4\n1 0 obj << /Subtype /Image /Filter /DCTDecode >> endobj\n",
  );
  const bytes = new Uint8Array(size);
  bytes.set(head);
  return new File([bytes], name, { type: "application/pdf" });
}

function engine(over: Partial<PdfDocumentHandle> = {}, pages = 4) {
  const handle: PdfDocumentHandle = {
    numPages: pages,
    firstPageHasText: async () => false,
    renderPage: async () => ({ base64: "AAAA", mimeType: "image/jpeg", width: 1700, height: 2400 }),
    destroy: vi.fn(),
    ...over,
  };
  return { handle, open: vi.fn(async () => handle) };
}

const b64Of = (bytes: number) => btoa("a".repeat(Math.max(1, Math.floor(bytes))));
const assembled = (bytes: number): AssembledPdf => ({
  base64: b64Of(bytes),
  bytes,
  pageCount: 4,
  pages: [{ width: 1700, height: 2400, quality: 0.8 }],
});

describe("untouched cases: the original goes up exactly as picked", () => {
  it("a PDF at or under the trigger is not even opened", async () => {
    const e = engine();
    const f = pdf(SHRINK_TRIGGER_BYTES, "scan");
    const out = await run(f, { open: e.open });
    expect(out.file).toBe(f);
    expect(out.report.outcome).toBe("small");
    expect(e.open).not.toHaveBeenCalled();
  });

  it("a TYPED PDF (a /Font in its bytes) under the ceiling is untouched and pdf.js is never loaded", async () => {
    const e = engine();
    const f = pdf(5 * MB, "typed");
    const out = await run(f, { open: e.open });
    expect(out.file).toBe(f);
    expect(out.report.outcome).toBe("typed");
    expect(e.open).not.toHaveBeenCalled();
  });

  it("a PDF whose bytes hide the fonts (object streams) is probed: a text layer on page 1 leaves it untouched", async () => {
    const e = engine({ firstPageHasText: async () => true });
    const f = pdf(5 * MB, "objstm");
    const out = await run(f, { open: e.open });
    expect(out.file).toBe(f);
    expect(out.report.outcome).toBe("typed");
    expect(e.open).toHaveBeenCalledTimes(1);
  });

  it("classifyPdfBytes: /Font = typed, image-only = scanned, compressed objects = unknown", () => {
    const enc = (s: string) => new TextEncoder().encode(s);
    expect(classifyPdfBytes(enc("<< /Type /Font >>"))).toBe("typed");
    expect(classifyPdfBytes(enc("<< /Font << /F1 3 0 R >> >>"))).toBe("typed");
    expect(classifyPdfBytes(enc("<< /Subtype /Image >>"))).toBe("scanned");
    expect(classifyPdfBytes(enc("<< /Type /ObjStm >> <</Subtype/Image>>"))).toBe("unknown");
    expect(classifyPdfBytes(enc("%PDF-1.4"))).toBe("unknown");
  });

  it("a non-PDF is returned as is", async () => {
    const f = new File([new Uint8Array(5 * MB)], "a.jpg", { type: "image/jpeg" });
    const out = await run(f);
    expect(out.file).toBe(f);
    expect(out.report.outcome).toBe("small");
  });
});

describe("a scanned PDF is shrunk on the stricter ladder", () => {
  it("6 MB scan -> under the 2 MB target, on the shrink ladder with the 2 MB cap", async () => {
    const e = engine();
    const assemble = vi.fn(async () => assembled(1.4 * MB));
    const f = pdf(6 * MB, "scan");
    const out = await run(f, { open: e.open, assemble });
    expect(out.report.outcome).toBe("shrunk");
    expect(out.file.size).toBeLessThan(SHRINK_TARGET_BYTES);
    expect(out.file.size).toBeLessThan(f.size);
    expect(out.file.type).toBe("application/pdf");
    expect(out.file.name).toBe("paper.pdf");
    const opts = (assemble.mock.calls[0] as unknown as [unknown, { rungs: typeof SHRINK_RUNGS; capBytes: number }])[1];
    expect(opts.capBytes).toBe(SHRINK_TARGET_BYTES);
    expect(opts.rungs).toBe(SHRINK_RUNGS);
    expect(e.handle.destroy).toHaveBeenCalled();
  });

  it("the ladder starts at 2400 px / 0.85 and NEVER goes below the floor (CONTROL: the page tray's ladder does)", async () => {
    expect(SHRINK_RUNGS[0]).toEqual([2400, 0.85]);
    for (const [edge, quality] of SHRINK_RUNGS) {
      expect(edge).toBeGreaterThanOrEqual(SHRINK_FLOOR_LONG_EDGE);
      expect(quality).toBeGreaterThanOrEqual(SHRINK_FLOOR_QUALITY);
    }
    const { PDF_RUNGS } = await import("./assemblePagesPdf");
    expect(PDF_RUNGS.some(([edge, q]) => edge < SHRINK_FLOOR_LONG_EDGE || q < SHRINK_FLOOR_QUALITY)).toBe(true);
  });

  it("floor reached and still over the target: the floor version goes ONLY if it is smaller than the original", async () => {
    const assemble = vi
      .fn()
      .mockRejectedValueOnce(new PagesTooLargeError())
      .mockResolvedValueOnce(assembled(3.1 * MB));
    const e = engine();
    const out = await run(pdf(6 * MB, "scan"), { open: e.open, assemble });
    expect(out.report.outcome).toBe("floor");
    expect(out.file.size).toBeLessThan(6 * MB);
    const second = assemble.mock.calls[1][1] as { rungs: Array<[number, number]>; capBytes: number };
    expect(second.rungs).toEqual([[SHRINK_FLOOR_LONG_EDGE, SHRINK_FLOOR_QUALITY]]);
    expect(second.capBytes).toBe(6 * MB - 1);
  });

  it("CONTROL: nothing smaller than the original is found -> the original goes up", async () => {
    const e = engine();
    const assemble = vi.fn().mockRejectedValue(new PagesTooLargeError());
    const f = pdf(4 * MB, "scan");
    const out = await run(f, { open: e.open, assemble });
    expect(out.file).toBe(f);
    expect(out.report.outcome).toBe("kept-original");
  });

  it("a result no smaller than the original is discarded", async () => {
    const e = engine();
    const f = pdf(4 * MB, "scan");
    const out = await run(f, { open: e.open, assemble: vi.fn(async () => assembled(4.5 * MB)) });
    expect(out.file).toBe(f);
  });

  it("progress is reported page by page", async () => {
    const e = engine({}, 3);
    const seen: Array<[number, number]> = [];
    await run(pdf(6 * MB, "scan"), {
      open: e.open,
      assemble: vi.fn(async () => assembled(MB)),
      onProgress: (d, t) => seen.push([d, t]),
    });
    expect(seen).toEqual([[1, 3], [2, 3], [3, 3]]);
  });
});

describe("a typed PDF over the 7 MB ceiling is rasterised rather than refused", () => {
  it("text layer dropped, reported, and the result fits the ceiling", async () => {
    const e = engine();
    const f = pdf(MAX_UPLOAD_PDF_BYTES + MB, "typed");
    const out = await run(f, { open: e.open, assemble: vi.fn(async () => assembled(2 * MB)) });
    expect(out.report.outcome).toBe("typed-rasterised");
    expect(out.report.textLayerDropped).toBe(true);
    expect(out.file.size).toBeLessThanOrEqual(MAX_UPLOAD_PDF_BYTES);
  });

  it("still over the ceiling after rasterising -> the original (the picker guard refuses it honestly)", async () => {
    const e = engine();
    const f = pdf(MAX_UPLOAD_PDF_BYTES + 3 * MB, "typed");
    const out = await run(f, {
      open: e.open,
      assemble: vi.fn(async () => assembled(MAX_UPLOAD_PDF_BYTES + MB)),
    });
    expect(out.file).toBe(f);
  });
});

describe("it never blocks an upload", () => {
  it("an engine that cannot open the file -> the original, outcome error, no throw", async () => {
    const f = pdf(6 * MB, "scan");
    const out = await run(f, {
      open: async () => {
        throw new Error("worker failed");
      },
    });
    expect(out.file).toBe(f);
    expect(out.report.outcome).toBe("error");
  });

  it("a render error mid-way -> the original", async () => {
    let n = 0;
    const e = engine({
      renderPage: async () => {
        n += 1;
        if (n === 2) throw new Error("bad page");
        return { base64: "AAAA", mimeType: "image/jpeg", width: 1, height: 1 };
      },
    });
    const f = pdf(6 * MB, "scan");
    const out = await run(f, { open: e.open });
    expect(out.file).toBe(f);
    expect(out.report.outcome).toBe("error");
    expect(e.handle.destroy).toHaveBeenCalled();
  });

  it("the page-1 projection beyond the budget -> the original, reported as a timeout", async () => {
    let clock = 0;
    const e = engine(
      {
        renderPage: async () => {
          clock += 3000;
          return { base64: "AAAA", mimeType: "image/jpeg", width: 1, height: 1 };
        },
      },
      10,
    );
    const reports: string[] = [];
    const f = pdf(6 * MB, "scan");
    const out = await run(f, { open: e.open, now: () => clock, onReport: (r) => reports.push(r.outcome) });
    expect(out.file).toBe(f);
    expect(out.report.outcome).toBe("timeout");
    expect(reports).toEqual(["timeout"]);
    expect(3000 * 10).toBeGreaterThan(SHRINK_BUDGET_MS);
  });

  it("the hard budget stops a re-encode that runs long", async () => {
    let clock = 0;
    const e = engine({}, 2);
    const reencode = vi.fn(async () => {
      clock += SHRINK_BUDGET_MS + 1;
      return { base64: "AAAA", width: 1, height: 1 };
    });
    const assemble = vi.fn(async (_pages: unknown, o: { reencode: (p: never, e: number, q: number) => Promise<unknown> }) => {
      await o.reencode({} as never, 2400, 0.85);
      await o.reencode({} as never, 2400, 0.8);
      return assembled(MB);
    });
    const out = await run(pdf(6 * MB, "scan"), {
      open: e.open,
      now: () => clock,
      assemble: assemble as never,
      reencode,
    });
    expect(out.report.outcome).toBe("timeout");
  });

  it("a throwing telemetry callback never blocks the upload", async () => {
    const f = pdf(1 * MB, "scan");
    const out = await run(f, {
      onReport: () => {
        throw new Error("telemetry down");
      },
    });
    expect(out.file).toBe(f);
  });
});

describe("the trigger saves more bytes than the code costs (D144)", () => {
  // Measured transfer sizes of the pdf.js LEGACY build as shipped (core + worker): see the header of shrinkPdf.ts.
  const CODE_GZIP = 151_438 + 392_144;
  const CODE_BROTLI = 126_707 + 322_590;
  it("a file just over the trigger saves more than the code downloads (gzip AND brotli), with margin", () => {
    const saving = SHRINK_TRIGGER_BYTES - SHRINK_TARGET_BYTES;
    expect(saving).toBeGreaterThan(CODE_GZIP);
    expect(saving).toBeGreaterThan(CODE_BROTLI);
    expect(saving / CODE_GZIP).toBeGreaterThan(1.5);
  });
  it("CONTROL: the spec's first 2 MB trigger would NOT clear the bar (it saves nothing)", () => {
    expect(2 * MB - SHRINK_TARGET_BYTES).toBeLessThan(CODE_GZIP);
  });
  it("the trigger sits under the ceiling and above the target", () => {
    expect(SHRINK_TRIGGER_BYTES).toBeGreaterThan(SHRINK_TARGET_BYTES);
    expect(SHRINK_TRIGGER_BYTES).toBeLessThan(MAX_UPLOAD_PDF_BYTES);
  });
});

describe("pdf.js stays out of every page bundle", () => {
  const SRC = resolve(process.cwd(), "src");
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) && !/\.test\./.test(n) ? [p] : [];
    });
  const files = walk(SRC);

  it("no source file imports pdfjs-dist statically", () => {
    const offenders = files.filter((f) => /^\s*import[^;]*from\s+["']pdfjs-dist/m.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
  it("shrinkPdf is reached only through a dynamic import() (PageTray)", () => {
    const offenders = files.filter(
      (f) =>
        !f.endsWith("shrinkPdf.ts") &&
        /^\s*import[^;]*from\s+["'][./]*(?:services\/)?shrinkPdf["']/m.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
    expect(readFileSync(join(SRC, "components/upload/PageTray.tsx"), "utf8")).toMatch(
      /await import\("\.\.\/\.\.\/services\/shrinkPdf"\)/,
    );
  });
});
