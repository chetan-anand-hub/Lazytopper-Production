/**
 * APPLY THE PRERENDERED BODIES INTO THE BUILT SHELLS — the half of prerendering that
 * runs on every platform, because it never opens a browser.
 *
 * ★ WHY THE WORK IS SPLIT IN TWO. No major AI crawler executes JavaScript: GPTBot,
 * ClaudeBot, PerplexityBot and OAI-SearchBot fetch raw HTML and stop, and every
 * advertised LazyTopper URL serves a body of `<div id="root"></div>`. The fix is to
 * render each page once and put the DOM in the file. The rendering needs a headless
 * browser — and a browser cannot run where this site is built:
 *
 *   GitHub Actions (ubuntu-latest)   captures 58 pages in ~30s        ✓
 *   Vercel build (Amazon Linux)      chrome-headless-shell:           ✗
 *                                    libnspr4.so: cannot open shared object file
 *   Railway backend image (slim)     libglib-2.0.so.0: same class     ✗
 *
 * `playwright install` downloads the binary in all three; it is the SYSTEM LIBRARIES
 * that are absent, and `--with-deps` shells out to apt-get, which Amazon Linux does
 * not have. So the capture runs in CI, its output is committed, and THIS step — pure
 * file IO — puts it into the build. No browser on any deploy path, no runtime
 * component, and crawlers and students receive byte-identical HTML, so the cloaking
 * question that dynamic rendering raises never arises.
 *
 * ⚠ THIS MUST RUN AFTER `writeStaticHeads`, FOR THE REASON THAT MAKES THIS WHOLE AREA
 * DANGEROUS. `writeStaticHeads` reads the built shell ONCE and stamps all 116 files
 * from that one string, so anything written into those files BEFORE it is silently
 * overwritten — and anything written into `public/` is overwritten too, which is why
 * the artifact does not live there. Running last is what makes each page's body its
 * own.
 *
 * ★ THE ARTIFACT IS BODY FRAGMENTS, NOT WHOLE PAGES, AND THE REASON IS CHURN RATHER
 * THAN SIZE. A whole page embeds the entry bundle's content hash
 * (`<script src="/app/assets/index-XXXXXXXX.js">`), which moves on ANY code change —
 * so committing pages would rewrite every one of them on every merge that touches
 * `src/`, whether or not a single word of content changed, and the artifact would be
 * permanent review noise. A fragment carries no entry hash, so it changes only when
 * the rendered content changes. (Also: the two files emitted per path are
 * byte-identical — verified across all 58 pairs — so one fragment fills both.)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { sitemapPaths } from "../../src/config/sitemapUrls";

const LAZYTOPPER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Where the committed capture lives. Deliberately NOT under `public/` — see the header. */
export const PRERENDERED_DIR = resolve(LAZYTOPPER_ROOT, "prerendered");

/** The mount point in the stamped shell, replaced with the captured DOM. */
const EMPTY_ROOT = '<div id="root"></div>';

/**
 * Every advertised path this step fills — the sitemap's whole set, root included.
 *
 * ★ THE ROOT IS CAPTURED NOW (SEO-FRESH-1, owner ruling OR-A1-1), AND THE REASON IT
 * USED TO BE EXCLUDED IS ANSWERED, NOT IGNORED. `RootEntry` serves `Welcome` signed-out
 * and `DesktopHome` signed-in, and — the part that made it unsafe — the root's file,
 * `index.html`, was ALSO the SPA fallback: `vercel.json` rewrote every unmatched
 * `/app/*` URL to `/app/index.html`, so a filled root would have put the landing page in
 * front of `/app/login`, `/app/me` and every deep link. This step now copies the CLEAN
 * shell to `__shell.html` before filling the root (`SPA_SHELL`, below), and the
 * catch-all points there. Only `/app/` itself carries the landing body; a signed-in
 * student on `/app/` sees it until React mounts, which the owner accepted.
 *
 * ⚠ DRIVEN FROM `sitemapPaths()`, NEVER FROM A DIRECTORY LISTING. The build output also
 * contains 105 `visuals/*.html` copied from `public/`, which are not advertised and
 * must not be touched.
 */
export function applicablePaths(): string[] {
  return sitemapPaths();
}

/**
 * The clean SPA shell every unmatched URL is served (`vercel.json` catch-all).
 * Written by this step as a byte copy of the built `index.html` BEFORE the root is
 * filled, so it can never carry the landing body. `X-Robots-Tag: noindex` is set on it
 * in `vercel.json`, and it is never advertised.
 */
export const SPA_SHELL = "__shell.html";

/**
 * Every robots meta, whatever its attribute order or quoting — used to COUNT, so a
 * second or reordered tag cannot hide from the exactly-once rule below.
 */
const ANY_ROBOTS_META = /<meta\b[^>]*\bname\s*=\s*["']robots["'][^>]*>/gi;
/** The one shape `index.html` ships, which is the only shape this step rewrites. */
const ROBOTS_META = /<meta\s+name="robots"\s+content="([^"]*)"\s*\/?>/gi;

/**
 * ROOT-URL-1 PR-2 (SEO-4, S1) — the shell says `noindex`, IN THE FILE.
 *
 * ★ WHY THE FILE AND NOT THE HEADER. `vercel.json` sets `X-Robots-Tag: noindex` on
 * `/__shell.html`, but Vercel matches header rules against the REQUEST path, not the
 * rewrite destination — so `/me`, `/tutor/...` and every unknown URL were served the
 * shell with no header at all, and with `index.html`'s own
 * `<meta name="robots" content="index,...">` copied into it (verified in production,
 * 2026-10-04). A meta inside the file travels with the file, whatever URL served it.
 *
 * ★ ONLY THE `index` DIRECTIVE CHANGES (owner condition 1). `index` becomes `noindex`;
 * every other directive (`follow`, `max-image-preview:large`) is kept as it is, so links
 * on the shell are still followed. Exactly one robots meta, carrying exactly one
 * `index`, or this THROWS — a shell that silently kept `index` is the defect itself.
 *
 * ⚠ ONLY `__shell.html` IS PASSED THROUGH THIS. `index.html` (the root, a sitemap URL)
 * and every stamped sitemap page keep the template's `index`.
 */
export function noindexShell(html: string): string {
  const found = html.match(ANY_ROBOTS_META)?.length ?? 0;
  const parsed = [...html.matchAll(ROBOTS_META)];
  if (found !== 1 || parsed.length !== 1) {
    throw new Error(
      `applyPrerendered: expected exactly ONE <meta name="robots" content="..."> in the ` +
        `built index.html to rewrite for ${SPA_SHELL}, found ${found} (${parsed.length} in the ` +
        `expected shape). Without it every non-sitemap URL is served an indexable shell.`,
    );
  }
  const directives = parsed[0][1].split(",").map((d) => d.trim());
  const indexAt = directives.map((d) => d.toLowerCase()).filter((d) => d === "index");
  if (indexAt.length !== 1) {
    throw new Error(
      `applyPrerendered: the robots meta "${parsed[0][1]}" does not carry exactly one ` +
        `"index" directive, so ${SPA_SHELL} cannot be flipped to noindex.`,
    );
  }
  const rewritten = directives.map((d) => (d.toLowerCase() === "index" ? "noindex" : d));
  return html.replace(ROBOTS_META, () => `<meta name="robots" content="${rewritten.join(",")}" />`);
}

/** The root's fragment is `index.html`; every other path is `<path>.html`. */
function fragmentStem(path: string): string {
  return path === "/" ? "index" : path.replace(/^\//, "");
}

/**
 * `/topic-hub/trigonometry` -> `<prerendered>/topic-hub/trigonometry.html`,
 * `/` -> `<prerendered>/index.html`.
 */
export function fragmentPathFor(path: string, dir: string = PRERENDERED_DIR): string {
  return join(dir, `${fragmentStem(path)}.html`);
}

/** Every `*.html` under `dir`, as advertised-style paths, for orphan detection. */
function fragmentsPresent(dir: string): string[] {
  const found: string[] = [];
  const walk = (current: string, prefix: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolute = join(current, entry.name);
      if (entry.isDirectory()) walk(absolute, `${prefix}/${entry.name}`);
      else if (entry.name.endsWith(".html")) {
        const path = `${prefix}/${entry.name.replace(/\.html$/, "")}`;
        // `index.html` at the top level is the root's fragment (`fragmentStem`).
        found.push(path === "/index" ? "/" : path);
      }
    }
  };
  walk(dir, "");
  return found;
}

/**
 * The asset URLs a fragment points at — the figures the captured DOM renders.
 *
 * ★ THIS IS THE STALENESS CHECK THAT RUNS EVERYWHERE, AND IT CATCHES THE DANGEROUS
 * FAILURE RATHER THAN THE COSMETIC ONE. Vite content-hashes these filenames, so a
 * figure that has been changed or renamed no longer exists under the name a stale
 * fragment holds. Without this check the build would happily ship a page whose images
 * 404 — worse than stale text, and invisible in every other gate. Measured on the
 * current capture: 65 asset references across the 58 fragments, all content-hashed,
 * none from `public/`.
 */
export function assetRefsIn(fragment: string): string[] {
  const refs = new Set<string>();
  // ROOT-URL-1: the optional `[^"]*\/` is what lets a ROOT asset (`/assets/x.webp`) match.
  // The old pattern demanded a segment before `/assets/` (the retired `/app` base), so at
  // the root it matched NOTHING and this staleness check would have passed vacuously.
  for (const match of fragment.matchAll(/(?:src|href)="(\/(?:[^"]*\/)?assets\/[^"]+)"/g)) {
    refs.add(match[1].split("?")[0]);
  }
  return [...refs];
}

/** Validate the whole artifact before a single file is written. */
export function validateArtifact(
  expected: readonly string[],
  present: readonly string[],
): string[] {
  const failures: string[] = [];
  const have = new Set(present);

  for (const path of expected) {
    if (!have.has(path)) {
      failures.push(`${path}: advertised, but no prerendered fragment exists for it`);
    }
  }
  for (const path of present) {
    if (!expected.includes(path)) {
      failures.push(`${path}: a prerendered fragment exists for a path that is not advertised`);
    }
  }
  return failures;
}

async function resolveOutDir(): Promise<string> {
  const override = process.argv.find((arg) => arg.startsWith("--out="));
  if (override) return resolve(LAZYTOPPER_ROOT, override.slice("--out=".length));

  // ⚠ SAME TRAP `writeStaticHeads` DOCUMENTS AT ITS OWN `resolveOutDir`. `vite build`
  // sets NODE_ENV=production inside its OWN process, and `vite.config.ts` branches
  // `build.outDir` on exactly that: production writes to
  // `artifacts/lazytopper-app/dist/public`, anything else to `dist`. This is a
  // separate process in the build chain, where NODE_ENV is whatever the shell had —
  // unset, in CI and on a dev box. Without this line the step resolves `dist`, finds
  // no shell, and fails the build while the real output sits untouched elsewhere.
  process.env.NODE_ENV = process.env.NODE_ENV || "production";

  const viteConfig = (await import("../../vite.config")).default;
  const outDir = (viteConfig as { build?: { outDir?: string } }).build?.outDir;
  if (typeof outDir !== "string" || outDir.length === 0) {
    throw new Error("applyPrerendered: vite.config.ts declares no build.outDir");
  }
  return resolve(LAZYTOPPER_ROOT, outDir);
}

export interface ApplyResult {
  /** Paths filled. 0 in the pre-capture state (no artifact directory). */
  applied: number;
  filesWritten: number;
  bodyBytes: number;
}

/**
 * Fill the built shells in `outDir` from the fragments in `prerenderedDir`.
 *
 * ★★ THE CLEAN SHELL IS WRITTEN FIRST AND UNCONDITIONALLY. `vercel.json` rewrites every
 * unmatched URL to `/__shell.html`, so a build without that file would 404
 * every deep link on the site — including in the pre-capture state below, where nothing
 * else is written. It is a byte copy of the built `index.html` taken BEFORE the root is
 * filled, and the copy is refused if `index.html` has already lost its empty mount point
 * (this step running twice), because that copy would carry the landing body onto
 * `/app/login`, `/app/me` and every other route — the exact spill it exists to prevent.
 */
export function applyArtifact(
  outDir: string,
  prerenderedDir: string = PRERENDERED_DIR,
  expected: readonly string[] = applicablePaths(),
): ApplyResult {
  const indexHtml = join(outDir, "index.html");
  if (!existsSync(indexHtml)) {
    throw new Error(
      `applyPrerendered: no built shell at ${indexHtml}. This step runs ` +
        `AFTER vite build AND after writeStaticHeads, and fills the files they emit.`,
    );
  }
  const cleanShell = readFileSync(indexHtml, "utf8");
  if (!cleanShell.includes(EMPTY_ROOT)) {
    throw new Error(
      `applyPrerendered: index.html has no empty mount point, so it is not a clean shell ` +
        `and cannot be copied to ${SPA_SHELL}. The shell changed shape, or this step ran twice.`,
    );
  }
  writeFileSync(join(outDir, SPA_SHELL), noindexShell(cleanShell), "utf8");

  // ★ THE UN-BOOTSTRAPPED STATE IS ANNOUNCED, NOT SKIPPED. Until the capture job has
  // committed its first artifact there is nothing to apply, and the site keeps the
  // empty bodies it serves today — which is the status quo, not a regression. That is
  // a legitimate state exactly once, so it says so loudly on stdout rather than
  // passing in silence. A directory that EXISTS must be complete: a partial artifact
  // is a broken one and fails below.
  if (!existsSync(prerenderedDir)) {
    // eslint-disable-next-line no-console
    console.log(
      `STATIC_BODIES_APPLY: no artifact at ${prerenderedDir} — ${expected.length} advertised ` +
        `pages keep an EMPTY BODY. This is the pre-capture state; the CI capture job has not ` +
        `committed a prerendered set yet. ${SPA_SHELL} was still written.`,
    );
    return { applied: 0, filesWritten: 0, bodyBytes: 0 };
  }

  const present = fragmentsPresent(prerenderedDir);
  const failures = validateArtifact(expected, present);
  if (failures.length > 0) {
    throw new Error(
      `applyPrerendered: the prerendered artifact does not match the advertised set ` +
        `(${failures.length} problem(s)). NOTHING WAS WRITTEN.\n  - ${failures.join("\n  - ")}`,
    );
  }

  // Validate every fragment against THIS build before touching a single output file:
  // a half-applied artifact is the failure mode this whole area exists to prevent.
  const fragments = new Map<string, string>();
  const assetFailures: string[] = [];
  for (const path of expected) {
    const fragment = readFileSync(fragmentPathFor(path, prerenderedDir), "utf8");
    fragments.set(path, fragment);
    for (const ref of assetRefsIn(fragment)) {
      // `/assets/x.webp` (or a based `/<base>/assets/x.webp`) -> `<outDir>/assets/x.webp`
      const relative = ref.replace(/^\/(?:[^/]*\/)?assets\//, "assets/");
      const absolute = join(outDir, relative);
      if (!existsSync(absolute) || !statSync(absolute).isFile()) {
        assetFailures.push(
          `${path}: references ${ref}, which this build did not emit — the fragment is ` +
            `STALE (the asset was changed or renamed since it was captured)`,
        );
      }
    }
  }
  if (assetFailures.length > 0) {
    throw new Error(
      `applyPrerendered: ${assetFailures.length} stale asset reference(s). NOTHING WAS ` +
        `WRITTEN — a page whose images 404 is worse than a page with an empty body.\n  - ` +
        assetFailures.join("\n  - "),
    );
  }

  let filesWritten = 0;
  let bodyBytes = 0;
  for (const [path, fragment] of fragments) {
    const relative = path.replace(/^\//, "");
    // The root is the one `index.html`; every other path has the two files
    // writeStaticHeads emitted for it.
    const targets = path === "/" ? ["index.html"] : [`${relative}.html`, join(relative, "index.html")];
    for (const target of targets) {
      const file = join(outDir, target);
      const shell = readFileSync(file, "utf8");
      if (!shell.includes(EMPTY_ROOT)) {
        throw new Error(
          `applyPrerendered: ${target} has no empty mount point to fill. The shell changed ` +
            `shape, or this step ran twice.`,
        );
      }
      writeFileSync(file, shell.replace(EMPTY_ROOT, `<div id="root">${fragment}</div>`), "utf8");
      filesWritten += 1;
    }
    bodyBytes += Buffer.byteLength(fragment, "utf8");
  }
  return { applied: fragments.size, filesWritten, bodyBytes };
}

async function main(): Promise<void> {
  const outDir = await resolveOutDir();
  const { applied, filesWritten, bodyBytes } = applyArtifact(outDir);

  // ★ Names its subject on every run, green included: a run that silently applied
  // nothing must be visible in the build log rather than reading as success.
  // eslint-disable-next-line no-console
  console.log(
    `STATIC_BODIES_APPLY: outDir=${outDir} advertised=${sitemapPaths().length} ` +
      `applied=${applied} (root included) files=${filesWritten} shell=${SPA_SHELL} ` +
      `body_bytes_total=${bodyBytes}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  });
}
