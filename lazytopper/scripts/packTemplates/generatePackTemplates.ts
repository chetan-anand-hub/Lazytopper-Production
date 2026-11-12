/**
 * generatePackTemplates - SERVER-PDF-1 PR-A. Renders every pack PDF ONCE, with the buyer's name, order id and dates left blank.
 *
 *   pnpm run gen:pack-templates -- plan   --out <dir>                                  # what must exist: <dir>/plan.json (renders nothing)
 *   pnpm run gen:pack-templates -- render --plan <dir>/plan.json --out <dir>/render \
 *                                         [--shard 0/4] [--existing existing.txt] [--only <templateId>] [--limit 3]
 *
 * HOW: like scripts/packPreviews, the REAL paid pipeline runs in headless Chrome (the Vite dev server serves gen.html; genEntry.ts runs
 * buildPackFiles' own file builders with the exporter's `template` option). A file whose hash is already in --existing is NOT rendered.
 * Writes <out>/files/<hash>.pdf + .meta.json and <out>/bridge/<key>.pdf + .meta.json. It NEVER uploads: see uploadPackTemplates.ts.
 *
 * Needs: Chrome (CHROME_PATH, else Playwright's chromium - `playwright install --only-shell chromium` in CI).
 * SYLLABUS GUARD: the templates are made by the same builders packSyllabus.guard.test.ts scans phrase by phrase (with its reviewed
 * incidental list); `plan` additionally refuses any row of PACK_SYLLABUS_EXCLUDED (see genEntry.ts).
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium, type Browser, type Page } from "@playwright/test";
import type { PackUnitsDef, PlanBridge, PlanFile } from "../../src/lib/packs/packTemplateCore";
import { bridgeKeyOf, fileHashOf, type Sha } from "../../src/lib/packs/packTemplateManifest";
import type { TemplateMarks } from "../../src/components/worksheet/worksheetPdfExport";
import type { BridgePagesData } from "../../src/lib/packs/packBridge";
import { rendererVersion } from "./rendererVersion";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

export const sha256 = (s: string | Uint8Array): string => createHash("sha256").update(s).digest("hex");
const sha: Sha = (t) => sha256(t);

export interface PlanFileJson {
  files: Array<PlanFile & { hash: string }>;
  bridges: Array<PlanBridge & { noCardKey: string; cardKey: string }>;
  packs: PackUnitsDef[];
  rendererVersion: string;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function withBrowser<T>(run: (open: () => Promise<Page>) => Promise<T>): Promise<T> {
  const server = await createServer({ root, server: { port: 0, host: "127.0.0.1" }, logLevel: "warn" });
  await server.listen();
  const addr = server.httpServer?.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  const browser: Browser = await chromium.launch({
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--js-flags=--max-old-space-size=3072"],
  });
  try {
    const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
    const open = async (): Promise<Page> => {
      const pg = await context.newPage();
      pg.on("pageerror", (e) => console.error("[page error]", e.message));
      pg.on("crash", () => console.error("[page crashed]"));
      await pg.goto(`http://127.0.0.1:${port}/scripts/packTemplates/gen.html`);
      await pg.waitForFunction(() => typeof window.__plan === "function" && typeof window.__renderTemplate === "function", null, { timeout: 180000 });
      return pg;
    };
    return await run(open);
  } finally {
    await browser.close();
    await server.close();
  }
}

async function planCommand(out: string): Promise<void> {
  fs.mkdirSync(out, { recursive: true });
  const version = rendererVersion(root);
  const { files, bridges, packs } = await withBrowser(async (open) => {
    const pg = await open();
    return pg.evaluate(() => window.__plan!());
  });
  const plan: PlanFileJson = {
    rendererVersion: version,
    packs,
    files: files.map((f) => ({ ...f, hash: fileHashOf(f, version, sha) })),
    bridges: bridges.map((b) => ({ ...b, noCardKey: bridgeKeyOf(b.data, false, version, sha), cardKey: bridgeKeyOf(b.data, true, version, sha) })),
  };
  fs.writeFileSync(path.join(out, "plan.json"), JSON.stringify(plan));
  const uniqueBridge = new Set(plan.bridges.flatMap((b) => [b.noCardKey, b.cardKey]));
  console.log(`plan: ${plan.files.length} templates, ${uniqueBridge.size} distinct bridge page sets, renderer ${version.slice(0, 12)}`);
}

type Item = { kind: "file"; id: string; hash: string } | { kind: "bridge"; key: string; data: BridgePagesData };

function itemsOf(plan: PlanFileJson): Item[] {
  const items: Item[] = plan.files.map((f) => ({ kind: "file", id: f.templateId, hash: f.hash }));
  const seen = new Set<string>();
  for (const b of plan.bridges) {
    for (const [key, card] of [[b.noCardKey, false], [b.cardKey, true]] as const) {
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ kind: "bridge", key, data: { ...b.data, boardPassCard: card } });
    }
  }
  return items;
}

async function renderCommand(planPath: string, out: string): Promise<void> {
  const plan = JSON.parse(fs.readFileSync(planPath, "utf8")) as PlanFileJson;
  if (plan.rendererVersion !== rendererVersion(root)) throw new Error("the plan was made by a different renderer version: run `plan` again");
  const existing = new Set((arg("existing") ? fs.readFileSync(arg("existing")!, "utf8") : "").split(/\r?\n/).filter(Boolean));
  const [shardIdx, shardN] = (arg("shard") ?? "0/1").split("/").map(Number);
  const only = arg("only");
  const limit = arg("limit") ? Number(arg("limit")) : Infinity;
  let items = itemsOf(plan).filter((_, i) => i % shardN === shardIdx);
  if (only) items = items.filter((it) => (it.kind === "file" ? it.id === only : false));
  items = items.filter((it) => !existing.has(it.kind === "file" ? `packs/files/${it.hash}.pdf` : `packs/bridge/${it.key}.pdf`)).slice(0, limit);
  fs.mkdirSync(path.join(out, "files"), { recursive: true });
  fs.mkdirSync(path.join(out, "bridge"), { recursive: true });
  console.log(`render: shard ${shardIdx}/${shardN}: ${items.length} to make`);
  await withBrowser(async (open) => {
    let page = await open();
    let sinceFresh = 0;
    for (const it of items) {
      // html2canvas on a whole chapter is memory-heavy: a fresh page every 20 files, and once more if one fails.
      if (sinceFresh >= 20) {
        await page.close();
        page = await open();
        sinceFresh = 0;
      }
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          if (it.kind === "file") {
            const [download, marks] = await Promise.all([
              page.waitForEvent("download", { timeout: 300000 }),
              page.evaluate((id) => window.__renderTemplate!(id), it.id),
            ]);
            const tmp = path.join(out, `.dl-${process.pid}.pdf`);
            await download.saveAs(tmp);
            const bytes = fs.readFileSync(tmp);
            fs.rmSync(tmp);
            const m = marks as TemplateMarks;
            const meta = { templateId: it.id, bytes: bytes.length, sha256: sha256(bytes), pages: m.pages, marks: m };
            fs.writeFileSync(path.join(out, "files", `${it.hash}.pdf`), bytes);
            fs.writeFileSync(path.join(out, "files", `${it.hash}.meta.json`), JSON.stringify(meta));
            console.log(`  ${it.id}  ${bytes.length} bytes, ${m.pages} pages`);
          } else {
            const b64 = await page.evaluate((d) => window.__renderBridge!(d), it.data);
            const bytes = Buffer.from(b64, "base64");
            fs.writeFileSync(path.join(out, "bridge", `${it.key}.pdf`), bytes);
            fs.writeFileSync(path.join(out, "bridge", `${it.key}.meta.json`), JSON.stringify({ bytes: bytes.length, sha256: sha256(bytes) }));
            console.log(`  bridge ${it.key.slice(0, 12)}  ${bytes.length} bytes`);
          }
          break;
        } catch (e) {
          console.error(`  attempt ${attempt} failed: ${(e as Error).message.slice(0, 200)}`);
          if (attempt === 2) throw e;
          await page.close();
          page = await open();
          sinceFresh = 0;
        }
      }
      sinceFresh += 1;
    }
  });
}

async function main(): Promise<void> {
  const cmd = process.argv.slice(2).find((a) => a !== "--");
  if (cmd === "plan") return planCommand(path.resolve(arg("out") ?? "pack-templates"));
  if (cmd === "render") return renderCommand(path.resolve(arg("plan") ?? "pack-templates/plan.json"), path.resolve(arg("out") ?? "pack-templates/render"));
  throw new Error("usage: gen:pack-templates -- plan --out <dir> | render --plan <file> --out <dir> [--shard i/n] [--existing file] [--only id] [--limit n]");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
