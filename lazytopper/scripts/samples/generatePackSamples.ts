/**
 * generatePackSamples - regenerates the free sample PDFs in lazytopper/public/samples/ (PACK-SAMPLE-1).
 *
 *   cd lazytopper && pnpm run gen:pack-samples            # all samples
 *   cd lazytopper && pnpm run gen:pack-samples -- lazytopper-sample-cbq-maths   # one
 *
 * HOW: the paid PDFs are made in the browser (React -> html2canvas -> jsPDF), so the samples are made by the same code in a
 * headless Chrome. This script starts the Vite dev server, opens scripts/samples/gen.html (dev only, never built), and for each
 * entry of PACK_SAMPLES calls window.__genSample(id), which runs buildPackFiles' own file builders and exportWorksheetPdf with
 * the `sample` option (page 1 only, "Sample" marking, the price line). The download is saved to public/samples/<id>.pdf.
 *
 * Chrome: set CHROME_PATH, otherwise the system "chrome" channel is used. Re-run it, and commit the PDFs, whenever the bank, the
 * PDF layout or a pack price changes (the price is printed on the page; packSamples.test.ts compares the page text to the catalogue).
 * Anti-fabrication: the page is a real question page from the real bank; nothing is typed into it by this script.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = path.join(root, "public", "samples");

async function main(): Promise<void> {
  const only = process.argv.slice(2).filter((a) => a !== "--");
  fs.mkdirSync(outDir, { recursive: true });
  const server = await createServer({ root, server: { port: 0, host: "127.0.0.1" }, logLevel: "warn" });
  await server.listen();
  const addr = server.httpServer?.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" });
  try {
    const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    page.on("pageerror", (e) => console.error("[page error]", e.message));
    await page.goto(`http://127.0.0.1:${port}/scripts/samples/gen.html`);
    await page.waitForFunction(() => Array.isArray(window.__sampleIds) && typeof window.__genSample === "function", null, { timeout: 120000 });
    const ids: string[] = await page.evaluate(() => window.__sampleIds ?? []);
    const todo = only.length ? ids.filter((id) => only.includes(id)) : ids;
    for (const id of todo) {
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 180000 }),
        page.evaluate((i) => window.__genSample?.(i), id),
      ]);
      const dest = path.join(outDir, `${id}.pdf`);
      await download.saveAs(dest);
      console.log(`${id}.pdf  ${fs.statSync(dest).size} bytes`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

declare global {
  interface Window {
    __genSample?: (id: string) => Promise<string>;
    __sampleIds?: string[];
  }
}
