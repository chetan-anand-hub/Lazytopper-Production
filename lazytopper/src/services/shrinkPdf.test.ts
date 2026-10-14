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
  SHRINK_FLOOR_LONG_EDGE,
  SHRINK_HARD_CEILING_MS,
  SHRINK_PROJECTION_FACTOR,
  TEXT_PROBE_PAGES,
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
/** A scan the server would refuse: the only kind the shrink ever touches (D223). */
const OVER = MAX_UPLOAD_PDF_BYTES + MB;

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
    pagesHaveText: async () => false,
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
    const f = pdf(OVER, "typed");
    const out = await run(f, { open: e.open });
    expect(out.file).toBe(f);
    expect(out.report.outcome).toBe("typed");
    expect(e.open).not.toHaveBeenCalled();
  });

  it("a PDF whose bytes hide the fonts (object streams) is probed: a text layer on page 1 leaves it untouched", async () => {
    const e = engine({ pagesHaveText: async () => true });
    const f = pdf(OVER, "objstm");
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

describe("a scanned PDF over the ceiling is shrunk, gentlest rung first", () => {
  it("a scan over the ceiling -> under the ceiling, on the shrink ladder with the ceiling as the cap", async () => {
    const e = engine();
    const assemble = vi.fn(async () => assembled(1.4 * MB));
    const f = pdf(OVER, "scan");
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

  it("the ladder starts at the GENTLEST rung (3000 px / 0.95), only gets lower, and NEVER goes below the measured floor (CONTROL: the page tray's ladder does)", async () => {
    expect(SHRINK_RUNGS[0]).toEqual([3000, 0.95]);
    for (let i = 1; i < SHRINK_RUNGS.length; i += 1) {
      expect(SHRINK_RUNGS[i][0]).toBeLessThanOrEqual(SHRINK_RUNGS[i - 1][0]);
      expect(SHRINK_RUNGS[i][1]).toBeLessThanOrEqual(SHRINK_RUNGS[i - 1][1]);
    }
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
    const out = await run(pdf(OVER, "scan"), { open: e.open, assemble });
    expect(out.report.outcome).toBe("floor");
    expect(out.file.size).toBeLessThan(OVER);
    const second = assemble.mock.calls[1][1] as { rungs: Array<[number, number]>; capBytes: number };
    expect(second.rungs).toEqual([[SHRINK_FLOOR_LONG_EDGE, SHRINK_FLOOR_QUALITY]]);
    expect(second.capBytes).toBe(OVER - 1);
  });

  it("CONTROL: nothing smaller than the original is found -> the original goes up", async () => {
    const e = engine();
    const assemble = vi.fn().mockRejectedValue(new PagesTooLargeError());
    const f = pdf(OVER, "scan");
    const out = await run(f, { open: e.open, assemble });
    expect(out.file).toBe(f);
    expect(out.report.outcome).toBe("kept-original");
  });

  it("a result no smaller than the original is discarded", async () => {
    const e = engine();
    const f = pdf(OVER, "scan");
    const out = await run(f, { open: e.open, assemble: vi.fn(async () => assembled(OVER + MB)) });
    expect(out.file).toBe(f);
  });

  it("progress is reported page by page", async () => {
    const e = engine({}, 3);
    const seen: Array<[number, number]> = [];
    await run(pdf(OVER, "scan"), {
      open: e.open,
      assemble: vi.fn(async () => assembled(MB)),
      onProgress: (d, t) => seen.push([d, t]),
    });
    expect(seen).toEqual([[1, 3], [2, 3], [3, 3]]);
  });
});

describe("D223: a typed PDF is never rasterised, even over the 7 MB ceiling", () => {
  it("it goes up as it is (the picker guard refuses it honestly); pdf.js is never loaded for a /Font PDF", async () => {
    const e = engine();
    const f = pdf(OVER, "typed");
    const out = await run(f, { open: e.open, assemble: vi.fn(async () => assembled(2 * MB)) });
    expect(out.file).toBe(f);
    expect(out.report.outcome).toBe("typed");
    expect(e.open).not.toHaveBeenCalled();
  });
  it("a typed PDF whose fonts hide in object streams is probed, and a text layer leaves it unchanged", async () => {
    const e = engine({ pagesHaveText: async () => true });
    const f = pdf(OVER, "objstm");
    const out = await run(f, { open: e.open, assemble: vi.fn(async () => assembled(2 * MB)) });
    expect(out.file).toBe(f);
    expect(out.report.outcome).toBe("typed");
  });
});

describe("it never blocks an upload", () => {
  it("an engine that cannot open the file -> the original, outcome error, no throw", async () => {
    const f = pdf(OVER, "scan");
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
    const f = pdf(OVER, "scan");
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
          clock += 6000;
          return { base64: "AAAA", mimeType: "image/jpeg", width: 1, height: 1 };
        },
      },
      10,
    );
    const reports: string[] = [];
    const f = pdf(OVER, "scan");
    const out = await run(f, { open: e.open, now: () => clock, onReport: (r) => reports.push(r.outcome) });
    expect(out.file).toBe(f);
    expect(out.report.outcome).toBe("timeout");
    expect(reports).toEqual(["timeout"]);
    expect(6000 * 10 * SHRINK_PROJECTION_FACTOR).toBeGreaterThan(SHRINK_HARD_CEILING_MS);
  });

  it("the hard budget stops a re-encode that runs long", async () => {
    let clock = 0;
    const e = engine({}, 2);
    const reencode = vi.fn(async () => {
      clock += SHRINK_HARD_CEILING_MS + 1;
      return { base64: "AAAA", width: 1, height: 1 };
    });
    const assemble = vi.fn(async (_pages: unknown, o: { reencode: (p: never, e: number, q: number) => Promise<unknown> }) => {
      await o.reencode({} as never, 2400, 0.85);
      await o.reencode({} as never, 2400, 0.8);
      return assembled(MB);
    });
    const out = await run(pdf(OVER, "scan"), {
      open: e.open,
      now: () => clock,
      assemble: assemble as never,
      reencode,
    });
    expect(out.report.outcome).toBe("timeout");
  });

  it("a throwing telemetry callback never blocks the upload", async () => {
    const f = pdf(OVER, "scan");
    const out = await run(f, {
      onReport: () => {
        throw new Error("telemetry down");
      },
    });
    expect(out.file).toBe(f);
  });
});

describe("D148: the text-layer probe reads the first 3 pages, not page 1 only", () => {
  /** A fake engine whose pages carry text or not; `pagesHaveText(n)` looks at the first n only. */
  const textOn = (pages: boolean[]) =>
    engine({ numPages: pages.length, pagesHaveText: async (n: number) => pages.slice(0, n).some(Boolean) }, pages.length);

  it("★ page 1 empty (image-only cover), page 2 has text -> the PDF is typed and untouched", async () => {
    const e = textOn([false, true, true, true]);
    const f = pdf(OVER, "objstm");
    const out = await run(f, { open: e.open, assemble: vi.fn(async () => assembled(MB)) });
    expect(out.file).toBe(f);
    expect(out.report.outcome).toBe("typed");
  });

  it("text on page 3 still counts; text only from page 4 does not (the probe is the first TEXT_PROBE_PAGES)", async () => {
    expect(TEXT_PROBE_PAGES).toBe(3);
    const third = await run(pdf(OVER, "objstm"), { open: textOn([false, false, true, false]).open });
    expect(third.report.outcome).toBe("typed");
    const fourth = await run(pdf(OVER, "objstm"), {
      open: textOn([false, false, false, true]).open,
      assemble: vi.fn(async () => assembled(MB)),
    });
    expect(fourth.report.outcome).toBe("shrunk");
  });

  it("CONTROL: no text on any probed page -> it is a scan and is shrunk", async () => {
    const out = await run(pdf(OVER, "objstm"), {
      open: textOn([false, false, false, false]).open,
      assemble: vi.fn(async () => assembled(MB)),
    });
    expect(out.report.outcome).toBe("shrunk");
  });

  it("the probe is asked for min(3, pages) pages", async () => {
    const probe = vi.fn(async () => false);
    await run(pdf(OVER, "objstm"), { open: engine({ pagesHaveText: probe }, 2).open, assemble: vi.fn(async () => assembled(MB)) });
    expect(probe).toHaveBeenCalledWith(2);
  });
});

describe("the time budget: only a refused file is shrunk, so it gets the full 60 s", () => {
  it("the budget is the hard ceiling and there is no link-speed skip", async () => {
    expect(SHRINK_HARD_CEILING_MS).toBe(60_000);
    const e = engine();
    const out = await run(pdf(OVER, "scan"), { open: e.open, assemble: vi.fn(async () => assembled(MB)) });
    expect(out.report.outcome).toBe("shrunk");
  });
  it("a slow phone (3 s/page x 10 pages, projection 42 s) fits inside 60 s; 6 s/page does not and sends the original", async () => {
    const phone = (perPage: number) => {
      let clock = 0;
      const e = engine({ renderPage: async () => { clock += perPage; return { base64: "AAAA", mimeType: "image/jpeg", width: 1, height: 1 }; } }, 10);
      return { e, now: () => clock };
    };
    const ok = phone(3000);
    expect((await run(pdf(OVER, "scan"), { open: ok.e.open, now: ok.now, assemble: vi.fn(async () => assembled(MB)) })).report.outcome).toBe("shrunk");
    expect(3000 * 10 * SHRINK_PROJECTION_FACTOR).toBeLessThan(SHRINK_HARD_CEILING_MS);
    const slow = phone(6000);
    expect((await run(pdf(OVER, "scan"), { open: slow.e.open, now: slow.now })).report.outcome).toBe("timeout");
  });
});

describe("D150: the student can always skip", () => {
  it("★ aborting during the render stops at the next page and returns the original, reported as skipped", async () => {
    const ctl = new AbortController();
    let rendered = 0;
    const e = engine(
      {
        renderPage: async () => {
          rendered += 1;
          if (rendered === 2) ctl.abort();
          return { base64: "AAAA", mimeType: "image/jpeg", width: 1, height: 1 };
        },
      },
      6,
    );
    const f = pdf(OVER, "scan");
    const out = await run(f, { open: e.open, signal: ctl.signal });
    expect(out.file).toBe(f);
    expect(out.report.outcome).toBe("skipped");
    expect(rendered).toBe(2);
    expect(e.handle.destroy).toHaveBeenCalled();
  });

  it("already aborted before it starts: no pdf.js, the original", async () => {
    const ctl = new AbortController();
    ctl.abort();
    const e = engine();
    const f = pdf(OVER, "scan");
    const out = await run(f, { open: e.open, signal: ctl.signal });
    expect(out.file).toBe(f);
    expect(out.report.outcome).toBe("skipped");
    expect(e.open).not.toHaveBeenCalled();
  });
});

describe("the quality floor is the one the live grader A/B measured (13 Oct 2026)", () => {
  // Original vs shrunk, same model + prompt, the six hardest synthetic handwriting sheets, 4-6 reads each:
  // only 2400 px at q >= 0.90 held (36/36). q0.85/0.80/0.70 (at 2400, 3000 and native px), q0.88 and 2200/2000 px
  // at q0.90 all lost readability on at least one sheet. The spec's own floor (2000 px / q0.75) is therefore unsafe.
  it("floor = 2400 px / q0.90, and every rung is at or above it", () => {
    expect(SHRINK_FLOOR_LONG_EDGE).toBe(2400);
    expect(SHRINK_FLOOR_QUALITY).toBe(0.9);
    expect(SHRINK_RUNGS).toEqual([[3000, 0.95], [2800, 0.92], [2400, 0.92], [2400, 0.9]]);
    expect(SHRINK_RUNGS[SHRINK_RUNGS.length - 1]).toEqual([SHRINK_FLOOR_LONG_EDGE, SHRINK_FLOOR_QUALITY]);
    for (const [edge, q] of SHRINK_RUNGS) {
      expect(edge).toBeGreaterThanOrEqual(2400);
      expect(q).toBeGreaterThanOrEqual(0.9);
    }
  });
  it("CONTROL: the settings the eval REJECTED are all below this floor", () => {
    const rejected: Array<[number, number]> = [[2000, 0.75], [2400, 0.85], [2400, 0.8], [2400, 0.7], [3000, 0.85], [3508, 0.8], [2400, 0.88], [2200, 0.9], [2000, 0.9]];
    for (const [edge, q] of rejected) {
      expect(edge < SHRINK_FLOOR_LONG_EDGE || q < SHRINK_FLOOR_QUALITY).toBe(true);
    }
  });
});

describe("D223: the shrink fires ONLY when the upload would otherwise be refused", () => {
  it("the trigger and the target ARE the upload ceiling, and the ceiling is the number the server enforces", () => {
    expect(SHRINK_TRIGGER_BYTES).toBe(MAX_UPLOAD_PDF_BYTES);
    expect(SHRINK_TARGET_BYTES).toBe(MAX_UPLOAD_PDF_BYTES);
    const server = readFileSync(resolve(process.cwd(), "server/mentorImageSupport.cjs"), "utf8");
    expect(server).toContain("const MAX_MENTOR_PDF_BYTES = 7 * 1024 * 1024;");
    expect(MAX_UPLOAD_PDF_BYTES).toBe(7 * 1024 * 1024);
  });
  it("★ BYTE-IDENTICAL: any scanned or typed PDF at or under the ceiling comes out as the very same File, and nothing is opened", async () => {
    for (const size of [1 * MB, 3.6 * MB, 6.9 * MB, MAX_UPLOAD_PDF_BYTES - 1, MAX_UPLOAD_PDF_BYTES]) {
      for (const marker of ["scan", "typed", "objstm"] as const) {
        const e = engine();
        const assemble = vi.fn(async () => assembled(MB));
        const f = pdf(Math.floor(size), marker);
        const out = await run(f, { open: e.open, assemble });
        expect(out.file).toBe(f);
        expect(out.report.outcome).toBe("small");
        expect(out.file.size).toBe(Math.floor(size)); // the same File object, so the very same bytes
        expect(e.open).not.toHaveBeenCalled();
        expect(assemble).not.toHaveBeenCalled();
      }
    }
  });
  it("CONTROL: one byte over the ceiling IS considered (a scan is shrunk)", async () => {
    const e = engine();
    const out = await run(pdf(MAX_UPLOAD_PDF_BYTES + 1, "scan"), { open: e.open, assemble: vi.fn(async () => assembled(MB)) });
    expect(out.report.outcome).toBe("shrunk");
    expect(e.open).toHaveBeenCalledTimes(1);
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
