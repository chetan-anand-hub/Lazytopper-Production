/**
 * SOFT404-1 — regenerate (or check) the shell rewrites in the repo-root `vercel.json`.
 *
 *   npx tsx scripts/seo/writeVercelRewrites.ts --write   # rewrite vercel.json in place
 *   npx tsx scripts/seo/writeVercelRewrites.ts --check   # exit 1 if vercel.json differs (default)
 *
 * Run it after adding, removing or renaming a `<Route path>` in `src/App.tsx`. The rules come
 * from `src/config/routeRewrites.ts`; `soft404Routes.guard.test.ts` runs the same comparison in CI.
 * Only the rewrites whose destination is `/__shell.html` are touched; the redirects, the API
 * proxies, the asset rules, the headers and `ignoreCommand` are re-serialised unchanged.
 * The output keeps the file's own line endings (the committed blob is LF; a Windows checkout
 * with autocrlf shows CRLF), so --check agrees on every platform.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { withGeneratedRewrites } from "../../src/config/routeRewrites";

const LAZYTOPPER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const VERCEL_JSON = resolve(LAZYTOPPER_ROOT, "../vercel.json");
const APP_TSX = resolve(LAZYTOPPER_ROOT, "src/App.tsx");

/** The `vercel.json` text that `--write` produces (2-space JSON, trailing newline, the file's own EOL). */
export function generatedVercelJson(currentText: string, appSource: string): string {
  const next = withGeneratedRewrites(JSON.parse(currentText), appSource);
  const eol = currentText.includes("\r\n") ? "\r\n" : "\n";
  return JSON.stringify(next, null, 2).replace(/\n/g, eol) + eol;
}

function main(): void {
  const write = process.argv.includes("--write");
  const current = readFileSync(VERCEL_JSON, "utf8");
  const next = generatedVercelJson(current, readFileSync(APP_TSX, "utf8"));
  if (next === current) {
    process.stdout.write("vercel.json: shell rewrites match the router (no change)\n");
    return;
  }
  if (!write) {
    process.stderr.write(
      "vercel.json: shell rewrites are OUT OF DATE with the router in src/App.tsx.\n" +
        "Run: npx tsx scripts/seo/writeVercelRewrites.ts --write\n",
    );
    process.exit(1);
  }
  writeFileSync(VERCEL_JSON, next);
  process.stdout.write("vercel.json: shell rewrites regenerated from the router\n");
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
