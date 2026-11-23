/**
 * UI-E2E-1 — serve the PRODUCTION BUILD the way Vercel serves it, for the ui-e2e suite.
 *
 * Run:  pnpm --filter lazytopper exec tsx tests/e2e/support/serveBuild.ts   (Playwright's
 * `webServer` does this for you; see playwright.config.ts).
 *
 * ★ WHY A LOCAL BUILD AND NOT THE VERCEL PREVIEW. Every PR does get a Vercel Preview
 * (~1.5 min after the push, publicly reachable), and that was the first choice. It was
 * measured and rejected: the Preview environment is built WITHOUT production's
 * `VITE_FREE_CHECK_ENABLED` / `VITE_PAYMENTS_ENABLED`. On a Preview, signed-out
 * /check-improve redirects to the sign-in page, the landing's "Check my answer" links to
 * /sign-up, /packs has no Buy buttons and /pricing has no Pay bar — i.e. the exact funnel
 * this suite exists to protect is not on the Preview at all. So the workflow builds the
 * app with production's flags (the same two flags prerender-capture.yml builds with,
 * OR-A1-5) and this file serves that build.
 *
 * ★ SERVED LIKE THE HOST, NOT LIKE `vite preview`. The order mirrors Vercel (and
 * captureStaticBodies.ts, which records the same order): the device middleware first —
 * imported from the REAL `middleware.ts`, so a desktop client gets `/__desktop/<page>.html`
 * by the same code production runs — then an exact file, then `<path>.html`, then
 * `<path>/index.html`, then the clean SPA shell (`__shell.html`, vercel.json's catch-all).
 * A request path is only ever a KEY LOOKUP in a map built by walking the output
 * directory; nothing from the request reaches `readFileSync`.
 *
 * ★ NO BACKEND. `/api/*` and `/shared-api/*` are answered here with 404 JSON. The specs
 * route every API call the pages make to recorded fixtures (support/network.ts) and fail on
 * any call without one, so a run never touches the production backend, never spends an AI
 * call and never reaches a payment provider.
 */
import { createServer } from "node:http";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { devicePlanFor } from "../../../../middleware";

const HERE = dirname(fileURLToPath(import.meta.url));
const LAZYTOPPER_ROOT = resolve(HERE, "..", "..", "..");

export const E2E_DEFAULT_PORT = 4310;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".pdf": "application/pdf",
  ".webmanifest": "application/manifest+json",
};

/**
 * `build.outDir` from vite.config — the same source writeStaticHeads / captureStaticBodies
 * read. `vite build` sets NODE_ENV=production inside its own process and vite.config
 * branches outDir on it, so a separate process must mirror that or it resolves `dist`.
 */
async function resolveOutDir(): Promise<string> {
  if (process.env.E2E_DIST) return resolve(LAZYTOPPER_ROOT, process.env.E2E_DIST);
  process.env.NODE_ENV = process.env.NODE_ENV || "production";
  const viteConfig = (await import("../../../vite.config")).default as { build?: { outDir?: string } };
  const outDir = viteConfig.build?.outDir;
  if (typeof outDir !== "string" || !outDir) throw new Error("serveBuild: vite.config.ts declares no build.outDir");
  return resolve(LAZYTOPPER_ROOT, outDir);
}

function indexBuiltOutput(outDir: string): Map<string, string> {
  const index = new Map<string, string>();
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const absolute = join(dir, entry.name);
      const key = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) walk(absolute, key);
      else index.set(key, absolute);
    }
  };
  walk(outDir, "");
  return index;
}

async function main(): Promise<void> {
  const outDir = await resolveOutDir();
  if (!existsSync(join(outDir, "index.html"))) {
    throw new Error(
      `serveBuild: no build at ${outDir}. Build first, with production's flags:\n` +
        `  VITE_FREE_CHECK_ENABLED=1 VITE_PAYMENTS_ENABLED=1 pnpm --filter lazytopper run build`,
    );
  }
  const index = indexBuiltOutput(outDir);
  const shell = index.get("/__shell.html") ?? index.get("/index.html")!;
  const port = Number(process.env.E2E_PORT || E2E_DEFAULT_PORT);

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      pathname = "/";
    }

    if (/^\/(?:shared-)?api(?:\/|$)/.test(pathname)) {
      res.writeHead(404, { "Content-Type": MIME[".json"] });
      res.end(JSON.stringify({ ok: false, error: "ui-e2e: no backend; the spec must route this call to a fixture" }));
      return;
    }

    // Vercel Web Analytics only exists on Vercel; the suite stubs it (support/network.ts).
    if (pathname.startsWith("/_vercel/")) {
      res.writeHead(204);
      res.end();
      return;
    }

    // The production middleware decides the device variant (desktop UAs get /__desktop/...).
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
    const plan = devicePlanFor(new Request(url, { method: req.method, headers }));
    if (plan.rewriteTo && index.has(plan.rewriteTo)) pathname = plan.rewriteTo;

    const bare = pathname.replace(/\/$/, "");
    const file =
      index.get(pathname) ?? index.get(`${bare}.html`) ?? index.get(`${bare}/index.html`) ?? shell;

    res.writeHead(200, {
      "Content-Type": MIME[extname(file).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "no-store",
      ...plan.headers,
    });
    res.end(req.method === "HEAD" ? undefined : readFileSync(file));
  });

  server.listen(port, "127.0.0.1", () => {
    process.stdout.write(`UI_E2E_SERVE: ${outDir} on http://127.0.0.1:${port} (${index.size} files)\n`);
  });
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
