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

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { criticalCss } from "./criticalCss";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { sitemapPaths } from "../../src/config/sitemapUrls";
import { routeChunkModulesFor } from "./writeStaticHeads";
import {
  APP_ENTRY_ATTR,
  APP_PRELOADS_ATTR,
  ISLAND_ENTRY_NAME,
  ISLAND_PATH_PREFIXES,
  ISLAND_SCRIPT_ATTR,
  isIslandPath,
  islandsEnabled,
} from "../../src/islands/islandConfig";

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
 * SEO-5 PR-2 (D1) — THE DESKTOP VARIANT'S NON-PUBLIC PREFIX.
 *
 * ★ TWO CAPTURES, ONE URL. Every advertised page is captured at 390 px (the MOBILE file, the
 * default at the page's own path — what every unknown client gets) AND at 1280 px (the
 * DESKTOP variant, under this prefix). `middleware.ts` rewrites a desktop client's request
 * for the page's own URL to the variant, so the URL — and so the canonical — never changes.
 *
 * ★ NEVER ADVERTISED, NEVER INDEXABLE ON ITS OWN URL. Nothing derives a sitemap, `llms.txt`
 * or a link from this prefix (`sitemapPaths()` is the only source of advertised URLs). A
 * DIRECT request to `/__desktop/...` is answered with `X-Robots-Tag: noindex` by
 * `middleware.ts` — keyed on the REQUEST path, so a rewritten request for the real URL never
 * carries it. The variant FILE keeps the page's own `index` robots meta and canonical: it is
 * what desktop Googlebot reads AT THE REAL URL, and a noindex inside it would deindex the page.
 *
 * ⚠ `middleware.ts` (repo root, no node imports) carries its own copy of this mapping as
 * `desktopVariantPath`; `vercelMiddleware.test.ts` asserts the two agree for every advertised
 * path, so they cannot drift apart in silence.
 */
export const DESKTOP_PREFIX = "__desktop";

/** `/notes/x` -> `<prerendered>/__desktop/notes/x.html`; `/` -> `<prerendered>/__desktop/index.html`. */
export function desktopFragmentPathFor(path: string, dir: string = PRERENDERED_DIR): string {
  return join(dir, DESKTOP_PREFIX, `${fragmentStem(path)}.html`);
}

/** The built desktop variant, relative to `outDir`: `__desktop/notes/x.html`, `__desktop/index.html`. */
export function desktopVariantFile(path: string): string {
  return `${DESKTOP_PREFIX}/${fragmentStem(path)}.html`;
}

/**
 * `/topic-hub/trigonometry` -> `<prerendered>/topic-hub/trigonometry.html`,
 * `/` -> `<prerendered>/index.html`.
 */
export function fragmentPathFor(path: string, dir: string = PRERENDERED_DIR): string {
  return join(dir, `${fragmentStem(path)}.html`);
}

/**
 * Every `*.html` under `dir`, as advertised-style paths, for orphan detection. The
 * top-level desktop directory is NOT walked here — it is the second variant set, listed
 * by `desktopFragmentsPresent` and validated against the same advertised set.
 */
function fragmentsPresent(dir: string, skipDesktop = true): string[] {
  const found: string[] = [];
  const walk = (current: string, prefix: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolute = join(current, entry.name);
      if (skipDesktop && prefix === "" && entry.isDirectory() && entry.name === DESKTOP_PREFIX) continue;
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

/** The desktop variant set, as advertised-style paths (empty when the directory is absent). */
function desktopFragmentsPresent(dir: string): string[] {
  const desktopDir = join(dir, DESKTOP_PREFIX);
  return existsSync(desktopDir) ? fragmentsPresent(desktopDir, false) : [];
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
  variant: "mobile" | "desktop" = "mobile",
): string[] {
  const failures: string[] = [];
  const have = new Set(present);
  // The mobile set keeps its historical wording; the desktop set says which set it is.
  const tag = variant === "desktop" ? " [desktop variant]" : "";

  for (const path of expected) {
    if (!have.has(path)) {
      failures.push(`${path}: advertised, but no prerendered fragment exists for it${tag}`);
    }
  }
  for (const path of present) {
    if (!expected.includes(path)) {
      failures.push(`${path}: a prerendered fragment exists for a path that is not advertised${tag}`);
    }
  }
  return failures;
}

/**
 * SEO-5 PR-2 — the committed `manifest.json`'s `paths` must be EXACTLY the advertised set.
 *
 * ★ WHY THE MANIFEST IS LOAD-BEARING NOW. `middleware.ts` imports it as the set of paths that
 * HAVE a desktop variant. A path in the manifest with no built variant would rewrite desktop
 * clients to a missing file; a path missing from it would silently serve desktop the phone
 * layout. Both variant sets are validated against the advertised set above, so holding the
 * manifest to the same set makes the middleware's set and the built files one fact.
 */
export function validateManifest(expected: readonly string[], manifestJson: string | null): string[] {
  if (manifestJson === null) {
    return ["manifest.json: missing — middleware.ts reads its `paths` as the set of pages with a desktop variant"];
  }
  let paths: unknown;
  try {
    paths = (JSON.parse(manifestJson) as { paths?: unknown }).paths;
  } catch (error: unknown) {
    return [`manifest.json: not valid JSON (${String(error)})`];
  }
  if (!Array.isArray(paths) || !paths.every((p): p is string => typeof p === "string")) {
    return ["manifest.json: `paths` is not an array of strings"];
  }
  const listed: readonly string[] = paths;
  const failures: string[] = [];
  for (const path of expected) {
    if (!listed.includes(path)) failures.push(`manifest.json: advertised path ${path} is missing from its paths`);
  }
  for (const path of listed) {
    if (!expected.includes(path)) failures.push(`manifest.json: its paths list ${path}, which is not advertised`);
  }
  return failures;
}

/**
 * SEO-5 PR-2 (D4) — the shell's entry script: `<script type="module" crossorigin src="/assets/index-X.js">`.
 * Returns the public base the build serves assets under (`/`) and the entry chunk's file name.
 */
export function entryScriptOf(shellHtml: string): { base: string; entry: string } {
  const match = shellHtml.match(/<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]*?)assets\/([^"/]+\.js)"/);
  if (!match) {
    throw new Error(
      'applyPrerendered: no <script type="module" src=".../assets/*.js"> in the built shell, so the ' +
        'route chunks cannot be resolved for <link rel="modulepreload">.',
    );
  }
  return { base: match[1], entry: match[2] };
}

/**
 * The ONE emitted chunk for a module name, from this build's `assets/` listing.
 *
 * ★ EXACTLY ONE, OR THE BUILD FAILS. Vite emits `<name>-<8-char hash>.js`; the pattern is
 * anchored at both ends, so `Note` can never match `NoteModal-…` or `Note-Card-…`. Zero
 * matches means the module was renamed or stopped being a lazy chunk; two means the name
 * is ambiguous. Either way a preload would be wrong, and a silent wrong preload is a 404
 * (or a wasted download) nobody notices.
 */
export function resolveRouteChunk(moduleName: string, assetFiles: readonly string[]): string {
  const escaped = moduleName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}-[A-Za-z0-9_-]{8}\\.js$`);
  const hits = assetFiles.filter((file) => pattern.test(file));
  if (hits.length !== 1) {
    throw new Error(
      `applyPrerendered: route module "${moduleName}" matches ${hits.length} emitted chunk(s) ` +
        `(${hits.join(", ") || "none"}); exactly one is required to preload it. Was it renamed, ` +
        `or did it stop being a lazy route chunk? Update ROUTE_CHUNK_MODULES in writeStaticHeads.ts.`,
    );
  }
  return hits[0];
}

/**
 * The sibling chunks an emitted ES module imports STATICALLY — `import{a}from"./x.js"`,
 * `export*from"./x.js"`, `import"./x.js"`. A dynamic `import("./x.js")` is deliberately
 * NOT matched (the parenthesis): that is a lazy child the page loads later, or never, not a
 * dependency the route needs before it can render.
 */
export function staticImportsOf(code: string): string[] {
  const found = new Set<string>();
  for (const match of code.matchAll(/(?:\bfrom\s*|\bimport\s*)["']\.\/([^"'/]+\.js)["']/g)) {
    found.add(match[1]);
  }
  return [...found];
}

/** `start` and every chunk it reaches through static imports, breadth-first, `start` first. */
export function staticImportClosure(start: string, readChunk: (file: string) => string): string[] {
  const order: string[] = [];
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const file = queue.shift() as string;
    order.push(file);
    for (const dependency of staticImportsOf(readChunk(file))) {
      if (!seen.has(dependency)) {
        seen.add(dependency);
        queue.push(dependency);
      }
    }
  }
  return order;
}

/**
 * The `<link rel="modulepreload">` hrefs for one advertised path, resolved against THIS build.
 *
 * ★ P9 — NO MANIFEST, NO COMMITTED HASH. The route's module name comes from
 * `ROUTE_CHUNK_MODULES`; its hashed file from this build's `assets/` listing; its
 * dependencies from the emitted chunk's own static imports. Chunks the entry already loads
 * (the entry and everything IT statically imports) are left out: the shell's own
 * `<script type="module">` already fetches them.
 */
export function preloadHrefsFor(
  path: string,
  assetsDir: string,
  shellHtml: string,
  assetFiles: readonly string[] = readdirSync(assetsDir),
): string[] {
  const { base, entry } = entryScriptOf(shellHtml);
  const readChunk = (file: string): string => readFileSync(join(assetsDir, file), "utf8");
  const alreadyLoading = new Set(staticImportClosure(entry, readChunk));
  const hrefs: string[] = [];
  for (const moduleName of routeChunkModulesFor(path)) {
    for (const file of staticImportClosure(resolveRouteChunk(moduleName, assetFiles), readChunk)) {
      const href = `${base}assets/${file}`;
      if (!alreadyLoading.has(file) && !hrefs.includes(href)) hrefs.push(href);
    }
  }
  return hrefs;
}

/** Insert the preload links immediately before `</head>`, which must occur exactly once. */
export function withPreloads(html: string, hrefs: readonly string[]): string {
  if (hrefs.length === 0) return html;
  const closes = html.split("</head>").length - 1;
  if (closes !== 1) {
    throw new Error(`applyPrerendered: expected exactly one </head> to insert modulepreload links, found ${closes}`);
  }
  // #1608 review: route modulepreloads stay at their default priority. Lowering them (an earlier revision) delayed
  // the entry script and so React's start on real Slow 3G (desktop /pricing +0.87 s, /packs +0.3 s).
  const links = hrefs.map((href) => `<link rel="modulepreload" crossorigin href="${href}">`).join("");
  return html.replace("</head>", `${links}</head>`);
}

/**
 * LOW-END-3 PR-1 (d): the CSS files Vite injects when the entry dynamically imports
 * `chunkFile`, read from the entry's own `__vite__mapDeps` table:
 * `import("./X-hash.js"),__vite__mapDeps([i,j])` with `m.f=["assets/X-hash.js","assets/X-h2.css",…]`.
 *
 * ★ WHY. A lazy route's stylesheet (e.g. `CheckYourAnswerPage-*.css`) arrives only with its
 * chunk, AFTER the prerendered body has painted without it, so the page re-lays out when it
 * lands. That is the /check-your-answer shift (#963 §4.5: hero 106 → 271 px at 1440, CLS 0.898).
 * Inlined into the page's head, the first paint already has the route's styles and nothing moves.
 * When the chunk later loads, Vite appends the same rules as a <link>: identical values, no shift.
 *
 * No `__vite__mapDeps` call for the chunk means no CSS (Vite emits the call only when the
 * import has deps). A table that is present but cannot be read throws.
 */
export function dynamicImportCssOf(entryCode: string, chunkFile: string): string[] {
  const escaped = chunkFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const call = entryCode.match(new RegExp(`import\\("\\./${escaped}"\\)(?:\\.then\\([^()]*\\))*,__vite__mapDeps\\(\\[([0-9,]*)\\]`));
  if (!call) return [];
  const table = entryCode.match(/m\.f=\[([^\]]*)\]/);
  if (!table) {
    throw new Error(
      `applyPrerendered: the entry imports ${chunkFile} through __vite__mapDeps but its dependency ` +
        `table (m.f=[…]) could not be read. The Vite output changed shape.`,
    );
  }
  const files = [...table[1].matchAll(/"([^"]*)"/g)].map((m) => m[1]);
  const css: string[] = [];
  for (const index of call[1].split(",").filter(Boolean).map(Number)) {
    const dep = files[index];
    if (dep === undefined) {
      throw new Error(`applyPrerendered: __vite__mapDeps index ${index} for ${chunkFile} is outside the table`);
    }
    if (dep.endsWith(".css")) css.push(dep.replace(/^.*assets\//, ""));
  }
  return css;
}

/**
 * LOW-END-3 PR-1 (d), controller D63a: the ONLY routes whose own CSS is inlined (D137/D142 added
 * `ForParentsPage`: its hero shifted by CLS 0.388 at 1440 px without it, 0 with it; NCERT-BOOKS-1
 * added `NcertBooksPage`: CLS 0.46 at 1366 px without it).
 *
 * ★ WHY AN ALLOWLIST. Inlining every route's CSS also put `katex-*.css` (~8 KB br) into each
 * Notes and HPQ page and measurably delayed their first paint (B FCP +0.18–0.30 s, C FCP
 * +0.02–0.08 s). /check-your-answer (#963 §4.5) and /for-parents are the pages whose layout shifts
 * without their route CSS, so they are the pages that get it.
 */
// SOLUTIONS-1 (G) adds `SolutionsPage`: the same hero + card layout as NcertBooksPage.
/**
 * CLS-1 (6 Nov 2026): /packs (CLS 0.575 desktop, CrUX 0.30 phones), /cbq-class-10 (0.44), every CBQ chapter page
 * (1.085) and /contact (0.173) shifted for the same reason as the pages above: their CSS rode in with the lazy chunk
 * AFTER the prerendered body had painted unstyled. A module may name extra SHARED chunk CSS prefixes (the CBQ band,
 * the pack tiles, the founder badge ...) that its first paint needs; KaTeX stays out for the reason above.
 */
const OWN_ONLY: readonly string[] = [];
export const INLINE_ROUTE_CSS: Readonly<Record<string, readonly string[]>> = {
  CheckYourAnswerPage: OWN_ONLY,
  ForParentsPage: OWN_ONLY,
  NcertBooksPage: OWN_ONLY,
  SolutionsPage: OWN_ONLY,
  ContactPage: ["ParentReturnLink"],
  PacksPage: ["FounderBadge", "PacksShop", "PackSampleLink", "CbqBand", "PackTileBuy", "TestimonialVideo"],
  CbqHubPage: ["PackSampleLink", "CbqBand", "CbqChapterPage", "faqContent"],
  CbqChapterPage: ["CbqChapterPage"],
};
export const INLINE_ROUTE_CSS_MODULES: readonly string[] = Object.keys(INLINE_ROUTE_CSS);

/** The allowlisted route's own CSS files (never shared deps such as KaTeX) for `path`, in order. */
export function routeCssFor(
  path: string,
  assetsDir: string,
  shellHtml: string,
  assetFiles: readonly string[],
): string[] {
  const { entry } = entryScriptOf(shellHtml);
  const entryCode = readFileSync(join(assetsDir, entry), "utf8");
  const css: string[] = [];
  for (const moduleName of routeChunkModulesFor(path)) {
    if (!INLINE_ROUTE_CSS_MODULES.includes(moduleName)) continue;
    const prefixes = [moduleName, ...INLINE_ROUTE_CSS[moduleName]];
    for (const file of dynamicImportCssOf(entryCode, resolveRouteChunk(moduleName, assetFiles))) {
      if (prefixes.some((prefix) => file.startsWith(`${prefix}-`)) && !css.includes(file)) css.push(file);
    }
  }
  return css;
}

/**
 * A stylesheet's text, checked safe to inline: it must not close the `<style>` element, and
 * every `url()` must be absolute (a relative one resolved against `/assets/` in the file, but
 * would resolve against the PAGE once inlined).
 */
export function inlinableCss(file: string, css: string): string {
  if (/<\/style/i.test(css)) throw new Error(`applyPrerendered: ${file} contains "</style" and cannot be inlined`);
  for (const match of css.matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/g)) {
    if (!/^(?:\/|data:|https?:|#)/.test(match[2])) {
      throw new Error(`applyPrerendered: ${file} has a relative url(${match[2]}) that would break once inlined`);
    }
  }
  return css;
}

/**
 * Add `<style data-lt-inline="file">` blocks for a page's route CSS immediately before `</head>`
 * (after the entry stylesheet link, the order Vite's own links would give). The entry stylesheet
 * link itself is left as it is.
 */
export function withRouteStyles(html: string, blocks: ReadonlyArray<{ file: string; css: string }>): string {
  if (blocks.length === 0) return html;
  const closes = html.split("</head>").length - 1;
  if (closes !== 1) {
    throw new Error(`applyPrerendered: expected exactly one </head> to inline route CSS, found ${closes}`);
  }
  const styles = blocks.map(({ file, css }) => `<style data-lt-inline="${file}">${css}</style>`).join("");
  return html.replace("</head>", () => `${styles}</head>`);
}

/**
 * SPEED-SITE-1b — the entrance-animation classes stripped from a prerendered body before it
 * is written. Both start from `opacity: 0` (styles.css `mobFloatUp` / `mobFadeIn`).
 *
 * ★ WHY. A prerendered page is meant to paint its content at first paint. With
 * `animate-float-up` on the mobile shell's `<main>`, that first paint is at opacity 0, and
 * Chrome does not count an opacity-0 paint as a Largest Contentful Paint candidate. The
 * fade-in itself runs on the compositor, so nothing repaints when it ends, and the page's
 * LCP was recorded only when React re-inserted the same content, after the entry bundle
 * had downloaded and run. Measured on /notes/real-numbers (4x CPU): LCP 2280 ms with the
 * class, 316 ms without it.
 *
 * Only the static first paint changes. The app's own render (MobileShell) still carries the
 * class, so every in-app navigation fades in exactly as before, and the committed artifact
 * (what the capture records) is untouched.
 */
export const ENTRANCE_ANIMATION_CLASSES: readonly string[] = ["animate-float-up", "animate-fade-in"];

/**
 * The class attributes this step may edit: only inside a start TAG, never in text, never inside a
 * `<script>` or `<style>` element's raw contents and never in a comment. Those regions are copied
 * through untouched; in the rest, only `<tag ...>` matches are looked at (text is serialized with `<`
 * escaped, so it can never look like a tag). An attribute value holding a raw `>` ends the match early,
 * which can only make this step strip LESS (verifyBuiltPages would then fail the build loudly).
 */
const RAW_REGION = /<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const START_TAG = /<[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?>/g;
const CLASS_ATTR = /(\s)class="([^"]*)"/g;

function mapStartTags(html: string, edit: (tag: string) => string): string {
  let out = "";
  let at = 0;
  for (const raw of html.matchAll(RAW_REGION)) {
    out += html.slice(at, raw.index).replace(START_TAG, edit) + raw[0];
    at = (raw.index ?? 0) + raw[0].length;
  }
  return out + html.slice(at).replace(START_TAG, edit);
}

export function withoutEntranceAnimation(fragment: string): string {
  return mapStartTags(fragment, (tag) =>
    tag.replace(CLASS_ATTR, (whole, space: string, value: string) => {
      const tokens = value.split(/\s+/).filter((t) => t !== "");
      if (!tokens.some((t) => ENTRANCE_ANIMATION_CLASSES.includes(t))) return whole;
      const kept = tokens.filter((t) => !ENTRANCE_ANIMATION_CLASSES.includes(t));
      return kept.length > 0 ? `${space}class="${kept.join(" ")}"` : "";
    }),
  );
}

/** Every entrance-animation class still present on an element (a start tag) in a built page's body. */
export function entranceAnimationsIn(html: string): string[] {
  const body = html.slice(Math.max(0, html.indexOf("<body")));
  const found: string[] = [];
  mapStartTags(body, (tag) => {
    for (const match of tag.matchAll(CLASS_ATTR)) {
      for (const token of match[2].split(/\s+/)) if (ENTRANCE_ANIMATION_CLASSES.includes(token)) found.push(token);
    }
    return tag;
  });
  return found;
}

/**
 * SPEED-SITE-2f — the entry stylesheet no longer blocks a prerendered page's first paint.
 *
 * The rules that can apply to this page's HTML (`criticalCss`, scripts/seo/criticalCss.ts) are inlined in a
 * `<style data-lt-critical>` where the entry `<link rel="stylesheet">` was, and the full sheet is loaded without
 * blocking but at HIGH priority: `<link rel="preload" as="style" fetchpriority="high">` that becomes a stylesheet on
 * load (#1608 review: `media="print"` fetched it at the LOWEST priority, after the 237 KB entry script, so on Slow 3G
 * React started 1.1-4.2 s later than on trunk and /pricing hit the 3 s cap). The inline handlers record the outcome
 * on the element (`data-lt-css="loaded" | "failed"`) so main.tsx never waits for an event that already fired.
 * A `<noscript>` copy serves no-JS readers. The full sheet holds
 * the same rules in the same order after these, so its arrival changes nothing on screen, and main.tsx starts React
 * only once it has loaded (`deferredStylesheetReady`), so nothing the app renders is ever unstyled.
 * Only prerendered page files get this: `__shell.html` keeps its blocking link (it has no HTML to compute from).
 */
export const DEFERRED_CSS_ATTR = "data-lt-deferred-css";

export function withCriticalEntryCss(html: string, cssFile: string, css: string, critical: (css: string, html: string) => string): string {
  const link = `<link rel="stylesheet" crossorigin href="/assets/${cssFile}">`;
  const count = html.split(link).length - 1;
  if (count !== 1) {
    throw new Error(`applyPrerendered: expected exactly one entry stylesheet link ${link}, found ${count}`);
  }
  const body = html.slice(Math.max(0, html.indexOf("<body")));
  const subset = inlinableCss(cssFile, critical(css, body));
  const deferred =
    `<style data-lt-critical="${cssFile}">${subset}</style>` +
    `<link rel="preload" as="style" crossorigin href="/assets/${cssFile}" fetchpriority="high" ${DEFERRED_CSS_ATTR} ` +
    `onload="this.onload=null;this.onerror=null;this.rel='stylesheet';this.setAttribute('data-lt-css','loaded')" ` +
    `onerror="this.onload=null;this.onerror=null;this.setAttribute('data-lt-css','failed')">` +
    `<noscript>${link}</noscript>`;
  return html.replace(link, () => deferred);
}

/** The entry stylesheet's file name in the built shell (`index-<hash>.css`), or null if it has none. */
export function entryStylesheetOf(shellHtml: string): string | null {
  const m = shellHtml.match(/<link rel="stylesheet" crossorigin href="\/assets\/([^"/]+\.css)">/);
  return m ? m[1] : null;
}

/** Every `data-lt-inline` file name in a built page. */
export function inlinedStylesIn(html: string): string[] {
  return [...html.matchAll(/<style data-lt-inline="([^"]+)">/g)].map((m) => m[1]);
}

/**
 * LOW-END-3 PR-1 (a): every absolute URL on this site that a built page emits (canonical,
 * og:url, og:image, JSON-LD, links) must be the final `https://www.lazytopper.com/…`, and no
 * href/src may point under the retired `/app` base. Each of those costs the reader a redirect
 * hop (#963 §2d: +160–410 ms measured, ~0.9 s per new connection at a 300 ms RTT).
 */
export function hopUrlsIn(html: string): string[] {
  const bad = new Set<string>();
  for (const match of html.matchAll(/(?:https?:)?\/\/(?:[a-z0-9-]+\.)*lazytopper\.com[^\s"'<>)]*/gi)) {
    const url = match[0];
    if (!/^https:\/\/www\.lazytopper\.com(?:[/?#]|$)/.test(url)) bad.add(url);
    else if (/^https:\/\/www\.lazytopper\.com\/app(?:[/?#]|$)/.test(url)) bad.add(url);
  }
  for (const match of html.matchAll(/\b(?:href|src|action)="(\/app(?:[/?#][^"]*)?)"/g)) bad.add(match[1]);
  return [...bad];
}

/** Every `<link rel="modulepreload" href>` in a built page. */
export function modulepreloadHrefsIn(html: string): string[] {
  const hrefs: string[] = [];
  for (const tag of html.match(/<link\b[^>]*\brel="modulepreload"[^>]*>/g) ?? []) {
    const href = tag.match(/\bhref="([^"]+)"/);
    if (href) hrefs.push(href[1]);
  }
  return hrefs;
}

/**
 * SPEED-ISLANDS-1 — serve the page as an island: the app's module script becomes the island's, and the
 * route chunks the page used to modulepreload move into a data attribute (the island preloads them
 * when it loads the app). ONLY the one script tag changes: the body, canonical, meta and JSON-LD are
 * untouched (`islandSwap.guard.test.ts`). Exactly one entry tag, or this THROWS.
 */
export function withIsland(html: string, shellHtml: string, islandFile: string, appPreloads: readonly string[]): string {
  const { base, entry } = entryScriptOf(shellHtml);
  const tag = `<script type="module" crossorigin src="${base}assets/${entry}"></script>`;
  const count = html.split(tag).length - 1;
  if (count !== 1) {
    throw new Error(`applyPrerendered: expected exactly one app entry tag ${tag} to swap for the island, found ${count}`);
  }
  const island =
    `<script type="module" crossorigin src="${base}assets/${islandFile}" ${ISLAND_SCRIPT_ATTR} ` +
    `${APP_ENTRY_ATTR}="${base}assets/${entry}" ${APP_PRELOADS_ATTR}="${appPreloads.join(" ")}"></script>`;
  return html.replace(tag, () => island);
}

/** The island script tag in a built page: its src and the app entry it upgrades to, or null. */
export function islandScriptIn(html: string): { src: string; appEntry: string; preloads: string[] } | null {
  const tag = html.match(new RegExp(`<script\\b[^>]*\\b${ISLAND_SCRIPT_ATTR}\\b[^>]*>`));
  if (!tag) return null;
  const attr = (name: string) => tag[0].match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? "";
  return { src: attr("src"), appEntry: attr(APP_ENTRY_ATTR), preloads: attr(APP_PRELOADS_ATTR).split(/\s+/).filter(Boolean) };
}

/**
 * ★ PINS (a) AND (d), AGAINST THE REAL BUILD, ON EVERY BUILD — CI's Build step included.
 *
 * Re-reads what was WRITTEN, independent of how it was written: every advertised path has a
 * filled mobile file at its own path(s) AND a filled desktop variant; every page whose route
 * has a lazy chunk carries at least one modulepreload; and every modulepreload href names a
 * file that exists in this build's output. A preload built from a stale or mistyped name
 * fails HERE, in the build, instead of shipping a silent 404.
 */
export function verifyBuiltPages(
  outDir: string,
  expected: readonly string[],
  islandPaths: ReadonlySet<string> = new Set(),
): { failures: string[]; mobileFiles: number; desktopFiles: number; preloadLinks: number; islandFiles: number } {
  const failures: string[] = [];
  let mobileFiles = 0;
  let desktopFiles = 0;
  let preloadLinks = 0;
  let islandFiles = 0;
  const exists = (href: string) => {
    const target = join(outDir, href.replace(/^\/(?:[^/]*\/)?assets\//, "assets/"));
    return /\/assets\/[^/]+\.js$/.test(href) && existsSync(target) && statSync(target).isFile();
  };
  for (const path of expected) {
    const relative = path.replace(/^\//, "");
    const mobile = path === "/" ? ["index.html"] : [`${relative}.html`, join(relative, "index.html")];
    const files: Array<{ file: string; variant: "mobile" | "desktop" }> = [
      ...mobile.map((file) => ({ file, variant: "mobile" as const })),
      { file: desktopVariantFile(path), variant: "desktop" },
    ];
    for (const { file, variant } of files) {
      const absolute = join(outDir, file);
      if (!existsSync(absolute)) {
        failures.push(`${path}: the ${variant} file ${file} was not written`);
        continue;
      }
      const html = readFileSync(absolute, "utf8");
      if (html.includes(EMPTY_ROOT)) failures.push(`${path}: the ${variant} file ${file} has an EMPTY body`);
      const hrefs = modulepreloadHrefsIn(html);
      // SPEED-ISLANDS-1: an island page loads the island, never the app entry, and its route chunks are
      // handed to the island (data attribute) instead of preloaded; every other page is unchanged.
      const island = islandScriptIn(html);
      if (islandPaths.has(path)) {
        if (!island) failures.push(`${path}: the ${variant} file ${file} is an island path but carries no island script`);
        else {
          islandFiles += 1;
          if (html.includes('<script type="module" crossorigin src="/assets/index-')) {
            failures.push(`${path}: the ${variant} file ${file} loads the app entry as well as the island`);
          }
          for (const href of [island.src, island.appEntry, ...island.preloads]) {
            if (!exists(href)) failures.push(`${path}: the ${variant} file ${file} island names ${href}, which this build did not emit`);
          }
          if (routeChunkModulesFor(path).length > 0 && island.preloads.length === 0) {
            failures.push(`${path}: the ${variant} file ${file} hands the island no route chunk to preload`);
          }
          if (hrefs.length > 0) failures.push(`${path}: the ${variant} file ${file} is an island but still modulepreloads app chunks`);
        }
      } else {
        if (island) failures.push(`${path}: the ${variant} file ${file} carries the island script but is not an island path`);
        if (routeChunkModulesFor(path).length > 0 && hrefs.length === 0) {
          failures.push(`${path}: the ${variant} file ${file} carries no modulepreload for its route chunk`);
        }
      }
      for (const href of hrefs) {
        if (!exists(href)) {
          failures.push(`${path}: the ${variant} file ${file} preloads ${href}, which this build did not emit`);
        }
      }
      // SPEED-SITE-1b: no prerendered body paints its content at opacity 0.
      for (const cls of entranceAnimationsIn(html)) {
        failures.push(`${path}: the ${variant} file ${file} still carries the entrance animation "${cls}" in its body`);
      }
      // SPEED-SITE-2f: the entry stylesheet never blocks a prerendered page, and is never lost (deferred + noscript).
      if (html.includes('<link rel="stylesheet" crossorigin href="/assets/index-') && !html.includes(DEFERRED_CSS_ATTR)) {
        failures.push(`${path}: the ${variant} file ${file} still loads the entry stylesheet render-blocking`);
      }
      if (html.includes(DEFERRED_CSS_ATTR) && (!html.includes("<style data-lt-critical=") || !html.includes("<noscript><link rel=\"stylesheet\""))) {
        failures.push(`${path}: the ${variant} file ${file} defers the entry stylesheet without its critical CSS or noscript copy`);
      }
      // LOW-END-3 PR-1 (a): no URL that costs the reader a redirect hop.
      for (const url of hopUrlsIn(html)) {
        failures.push(`${path}: the ${variant} file ${file} emits ${url}, which redirects (not the final www URL)`);
      }
      preloadLinks += hrefs.length;
      if (variant === "mobile") mobileFiles += 1;
      else desktopFiles += 1;
    }
  }
  return { failures, mobileFiles, desktopFiles, preloadLinks, islandFiles };
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
  /** Mobile files: one for the root, two (both shapes) for every other path. */
  filesWritten: number;
  /** SEO-5 PR-2 (D1): one desktop variant per path, under `__desktop/`. */
  desktopFilesWritten: number;
  bodyBytes: number;
  /** SEO-5 PR-2 (D4): modulepreload links resolved per path (counted once per path). */
  preloadLinks: number;
  /** SPEED-ISLANDS-1: paths served as islands. */
  islandPaths: number;
}

export interface ApplyOptions {
  /**
   * Resolve and insert `<link rel="modulepreload">` (D4). Default true. Only a synthetic
   * build with no real `assets/` passes false — the real build never does.
   */
  preloads?: boolean;
  /**
   * SPEED-ISLANDS-1 — the path families served as islands. Default: none, so every synthetic build in the
   * guards behaves exactly as before; the real build (`main`) passes ISLAND_PATH_PREFIXES. LT_ISLANDS=0
   * turns them off whatever is passed. Islands need the real `assets/` (the island chunk), so
   * `preloads: false` never gets them.
   */
  islandPrefixes?: readonly string[];
}

/** The paths of `expected` served as islands under these options and this environment. */
export function islandPathsFor(
  expected: readonly string[],
  options: ApplyOptions = {},
  env: Record<string, string | undefined> = process.env,
): Set<string> {
  if (options.preloads === false) return new Set();
  const prefixes = options.islandPrefixes ?? [];
  // Only the real build (main, below) asks for islands; LT_ISLANDS=0 turns them off there too.
  if (!islandsEnabled(env)) return new Set();
  return new Set(expected.filter((path) => isIslandPath(path, prefixes)));
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
  options: ApplyOptions = {},
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
    return { applied: 0, filesWritten: 0, desktopFilesWritten: 0, bodyBytes: 0, preloadLinks: 0, islandPaths: 0 };
  }

  const present = fragmentsPresent(prerenderedDir);
  const manifestFile = join(prerenderedDir, "manifest.json");
  const failures = [
    ...validateArtifact(expected, present, "mobile"),
    // SEO-5 PR-2 (D1): the desktop variant set must be complete too — a PARTIAL artifact
    // (one width captured, or one page missing a variant) is a broken one.
    ...validateArtifact(expected, desktopFragmentsPresent(prerenderedDir), "desktop"),
    ...validateManifest(expected, existsSync(manifestFile) ? readFileSync(manifestFile, "utf8") : null),
  ];
  if (failures.length > 0) {
    throw new Error(
      `applyPrerendered: the prerendered artifact does not match the advertised set ` +
        `(${failures.length} problem(s)). NOTHING WAS WRITTEN.\n  - ${failures.join("\n  - ")}`,
    );
  }

  // Validate every fragment against THIS build before touching a single output file:
  // a half-applied artifact is the failure mode this whole area exists to prevent.
  const fragments = new Map<string, string>();
  const desktopFragments = new Map<string, string>();
  const assetFailures: string[] = [];
  for (const path of expected) {
    // SPEED-SITE-1b: the first paint shows the content, not an opacity-0 frame (see withoutEntranceAnimation).
    const fragment = withoutEntranceAnimation(readFileSync(fragmentPathFor(path, prerenderedDir), "utf8"));
    const desktopFragment = withoutEntranceAnimation(readFileSync(desktopFragmentPathFor(path, prerenderedDir), "utf8"));
    fragments.set(path, fragment);
    desktopFragments.set(path, desktopFragment);
    for (const ref of [...new Set([...assetRefsIn(fragment), ...assetRefsIn(desktopFragment)])]) {
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

  // D4 — resolve every page's route-chunk preloads against THIS build before writing
  // anything: a module name that resolves to no chunk (or two) fails here, with nothing
  // half-written. `preloads` is ignored only by the synthetic-build guards that have no
  // real `assets/` (and those assert it explicitly).
  const assetsDir = join(outDir, "assets");
  const preloads = new Map<string, string[]>();
  if (options.preloads !== false) {
    const assetFiles = readdirSync(assetsDir);
    for (const path of expected) preloads.set(path, preloadHrefsFor(path, assetsDir, cleanShell, assetFiles));
  }

  // LOW-END-3 PR-1 (d): each page's route CSS, resolved and checked before anything is written.
  const routeStyles = new Map<string, Array<{ file: string; css: string }>>();
  if (options.preloads !== false) {
    const assetFiles = readdirSync(assetsDir);
    for (const path of expected) {
      routeStyles.set(
        path,
        routeCssFor(path, assetsDir, cleanShell, assetFiles).map((file) => ({
          file,
          css: inlinableCss(file, readFileSync(join(assetsDir, file), "utf8")),
        })),
      );
    }
  }
  // SPEED-SITE-2f: the entry stylesheet, inlined per page as its critical subset (skipped by the synthetic-build
  // guards with no real assets, exactly like the preloads above).
  const entryCss = options.preloads !== false ? entryStylesheetOf(cleanShell) : null;
  const entryCssText = entryCss ? readFileSync(join(assetsDir, entryCss), "utf8") : "";
  // SPEED-ISLANDS-1: island paths swap the entry script and hand their route preloads to the island.
  const islands = islandPathsFor(expected, options);
  const islandFile = islands.size > 0 ? resolveRouteChunk(ISLAND_ENTRY_NAME, readdirSync(assetsDir)) : "";
  const finish = (path: string, html: string, hrefs: readonly string[]): string => {
    const styled = withRouteStyles(html, routeStyles.get(path) ?? []);
    const done = islands.has(path) ? withIsland(styled, cleanShell, islandFile, hrefs) : withPreloads(styled, hrefs);
    return entryCss ? withCriticalEntryCss(done, entryCss, entryCssText, criticalCss) : done;
  };

  let filesWritten = 0;
  let desktopFilesWritten = 0;
  let bodyBytes = 0;
  for (const [path, fragment] of fragments) {
    const relative = path.replace(/^\//, "");
    // The root is the one `index.html`; every other path has the two files
    // writeStaticHeads emitted for it.
    const targets = path === "/" ? ["index.html"] : [`${relative}.html`, join(relative, "index.html")];
    const hrefs = preloads.get(path) ?? [];
    // The stamped head for this path, read BEFORE its body is filled — the desktop variant is
    // the same page (same head, canonical and robots) with the 1280-px body.
    const stamped = readFileSync(join(outDir, targets[0]), "utf8");
    for (const target of targets) {
      const file = join(outDir, target);
      const shell = readFileSync(file, "utf8");
      if (!shell.includes(EMPTY_ROOT)) {
        throw new Error(
          `applyPrerendered: ${target} has no empty mount point to fill. The shell changed ` +
            `shape, or this step ran twice.`,
        );
      }
      writeFileSync(file, finish(path, shell.replace(EMPTY_ROOT, `<div id="root">${fragment}</div>`), hrefs), "utf8");
      filesWritten += 1;
    }
    const desktopFile = join(outDir, desktopVariantFile(path));
    mkdirSync(dirname(desktopFile), { recursive: true });
    const desktopFragment = desktopFragments.get(path) as string;
    writeFileSync(
      desktopFile,
      finish(path, stamped.replace(EMPTY_ROOT, `<div id="root">${desktopFragment}</div>`), hrefs),
      "utf8",
    );
    desktopFilesWritten += 1;
    bodyBytes += Buffer.byteLength(fragment, "utf8") + Buffer.byteLength(desktopFragment, "utf8");
  }
  return {
    applied: fragments.size,
    filesWritten,
    desktopFilesWritten,
    bodyBytes,
    preloadLinks: [...preloads.values()].reduce((total, list) => total + list.length, 0),
    islandPaths: islands.size,
  };
}

async function main(): Promise<void> {
  const outDir = await resolveOutDir();
  const islandOptions: ApplyOptions = { islandPrefixes: ISLAND_PATH_PREFIXES };
  const { applied, filesWritten, desktopFilesWritten, bodyBytes, preloadLinks, islandPaths } = applyArtifact(
    outDir,
    PRERENDERED_DIR,
    applicablePaths(),
    islandOptions,
  );

  // ★ Names its subject on every run, green included: a run that silently applied
  // nothing must be visible in the build log rather than reading as success.
  // eslint-disable-next-line no-console
  console.log(
    `STATIC_BODIES_APPLY: outDir=${outDir} advertised=${sitemapPaths().length} ` +
      `applied=${applied} (root included) files=${filesWritten} desktop_files=${desktopFilesWritten} ` +
      `shell=${SPA_SHELL} body_bytes_total=${bodyBytes} preload_links_per_page_total=${preloadLinks} ` +
      `island_paths=${islandPaths}${islandsEnabled(process.env) ? "" : " (LT_ISLANDS=0)"}`,
  );

  // ★ PINS (a) + (d) AGAINST THIS REAL BUILD — re-read from disk, independent of the writer.
  // Skipped only in the pre-capture state, where nothing was applied to verify.
  if (applied > 0) {
    const verified = verifyBuiltPages(outDir, applicablePaths(), islandPathsFor(applicablePaths(), islandOptions));
    // eslint-disable-next-line no-console
    console.log(
      `PRERENDER_DEVICE_VERIFY: pages=${applicablePaths().length} mobile_files=${verified.mobileFiles} ` +
        `desktop_files=${verified.desktopFiles} modulepreload_links=${verified.preloadLinks} island_files=${verified.islandFiles} ` +
        `failures=${verified.failures.length}`,
    );
    if (verified.failures.length > 0) {
      throw new Error(
        `applyPrerendered: ${verified.failures.length} built page(s) failed verification.\n  - ` +
          verified.failures.join("\n  - "),
      );
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  });
}
