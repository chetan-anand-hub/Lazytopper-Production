/**
 * generatePackPreviews - regenerates the pack pop-up's preview images, public/packs/previews/ (PACK-PREVIEW-1).
 *
 *   cd lazytopper && pnpm run gen:pack-previews                 # all nine preview sets
 *   cd lazytopper && pnpm run gen:pack-previews -- cbq-science  # one
 *
 * HOW: like scripts/samples/generatePackSamples.ts, the REAL pack PDFs are made in a headless Chrome by the paid pipeline (the
 * Vite dev server serves scripts/packPreviews/gen.html; genEntry.ts runs buildPackFiles' own file builders for the representative
 * file of each set named in src/lib/packs/packPreviews.ts). For each set this script then rasterises three pages with pdftoppm
 * (cover = page 1 and question page = page 2 of the questions file, answer-key page = page 2 of its answer key) and writes
 * <id>-<cover|questions|answer-key>-<480|827>.webp with ImageMagick. Nothing is typed onto a page.
 *
 * Needs: Chrome (CHROME_PATH, else the system "chrome" channel), `pdftoppm` (poppler) and ImageMagick (`convert`/`magick`
 * with WebP). Deterministic inputs: fixed licensee ("Sample Student", order SAMPLE), fixed date, seeded draws.
 *
 * SYLLABUS GUARD: the text of every rendered file is scanned with SURFACE_BANNED_PHRASES from scripts/src/syllabusGuard.ts; any hit aborts.
 * (pdftotext cannot read the pages, they are images, so the scan runs on the worksheet the PDF was made from, a superset of the pages
 * shown.) packPreviews.test.ts re-runs the same scan on the same builders without Chrome.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium } from "@playwright/test";
import { SURFACE_BANNED_PHRASES, scanContentForPhrases } from "../../../scripts/src/syllabusGuard";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const outDir = path.join(root, "public", "packs", "previews");
const SIZES = [480, 827] as const;
const PAGES: ReadonlyArray<{ name: string; which: "questions" | "answers"; page: number }> = [
  { name: "cover", which: "questions", page: 1 },
  { name: "questions", which: "questions", page: 2 },
  { name: "answer-key", which: "answers", page: 2 },
];

function magick(): string[] {
  try {
    execFileSync("magick", ["-version"], { stdio: "ignore" });
    return ["magick"];
  } catch {
    return ["convert"];
  }
}

async function main(): Promise<void> {
  const only = process.argv.slice(2).filter((a) => a !== "--");
  fs.mkdirSync(outDir, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pack-previews-"));
  const server = await createServer({ root, server: { port: 0, host: "127.0.0.1" }, logLevel: "warn" });
  await server.listen();
  const addr = server.httpServer?.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" }), args: ["--disable-dev-shm-usage", "--disable-gpu", "--js-flags=--max-old-space-size=3072"] });
  try {
    const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
    const open = async () => {
      const pg = await context.newPage();
      pg.on("pageerror", (e) => console.error("[page error]", e.message));
      pg.on("crash", () => console.error("[page crashed]"));
      pg.on("console", (m) => (m.type() === "error" ? console.error("[console]", m.text().slice(0, 300)) : undefined));
      await pg.goto(`http://127.0.0.1:${port}/scripts/packPreviews/gen.html`);
      await pg.waitForFunction(() => Array.isArray(window.__previewIds) && typeof window.__genPreview === "function", null, { timeout: 120000 });
      return pg;
    };
    let page = await open();
    const ids: string[] = await page.evaluate(() => window.__previewIds ?? []);
    for (const id of only.length ? ids.filter((i) => only.includes(i)) : ids) {
      // A fresh page per set: html2canvas on a whole chapter's PDF is memory-heavy, and one page does not survive nine of them.
      await page.close();
      page = await open();
      let scanText = "";
      const pdfs: Record<string, string> = {};
      for (const which of ["questions", "answers"] as const) {
        const [download] = await Promise.all([
          page.waitForEvent("download", { timeout: 300000 }),
          page.evaluate(([i, w]) => window.__genPreview?.(i, w as "questions" | "answers"), [id, which] as const),
        ]);
        pdfs[which] = path.join(tmp, `${id}-${which}.pdf`);
        await download.saveAs(pdfs[which]);
        scanText += (await page.evaluate(() => window.__lastText ?? "")) + "\n";
      }
      for (const p of PAGES) {
        const pdf = pdfs[p.which];
        const base = path.join(tmp, `${id}-${p.name}`);
        execFileSync("pdftoppm", ["-f", String(p.page), "-l", String(p.page), "-r", "100", "-png", "-singlefile", pdf, base]);
        for (const size of SIZES) {
          const dest = path.join(outDir, `${id}-${p.name}-${size}.webp`);
          execFileSync(magick()[0], [`${base}.png`, "-resize", `${size}x`, "-quality", "72", "-define", "webp:method=6", dest]);
          console.log(`${path.relative(root, dest)}  ${fs.statSync(dest).size} bytes`);
        }
      }
      const hits = scanContentForPhrases(scanText, SURFACE_BANNED_PHRASES);
      if (hits.size > 0) throw new Error(`preview ${id} shows banned 2026-27 syllabus text: ${[...hits.keys()].join(", ")}`);
      console.log(`${id}: syllabus scan clean (${scanText.length} chars)`);
    }
  } finally {
    await browser.close();
    await server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
