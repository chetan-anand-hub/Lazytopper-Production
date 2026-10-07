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
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { sitemapPaths } from "../../src/config/sitemapUrls";
import { routeChunkModulesFor } from "./writeStaticHeads";

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
  const links = hrefs.map((href) => `<link rel="modulepreload" crossorigin href="${href}">`).join("");
  return html.replace("</head>", `${links}</head>`);
}

/** The id of the deferred boot script on a hydrated prerendered page (LOW-END-3 PR-2, D74). */
export const BOOT_SCRIPT_ID = "lt-boot";

/** Which viewports a page's deferred boot defers on: those where `main.tsx` hydrates it. */
export type DeferredBoot = "narrow" | "any";

/**
 * LOW-END-3 PR-2 (D74): the files whose app start waits for the first frame — exactly the files
 * `main.tsx` HYDRATES (`hydratableRoutePreload` in src/App.tsx; `deferredBoot.guard.test.ts`
 * pins the two lists to each other). On these, React adopts the painted DOM and changes nothing,
 * so starting the app after the first frame cannot move LCP to a re-render (the cause of PR-1's
 * C LCP regression); every other file keeps today's head module script and preloads.
 *   - "any": /check-your-answer, which hydrates at every width (no DesktopShell).
 *   - "narrow": the MOBILE file of Notes, Topic Hub, Exam Trends and Predicted Questions. Those
 *     hydrate below 1024 px only; a wide viewport given this file boots at once, as today.
 */
export function deferredBootFor(path: string, variant: "mobile" | "desktop"): DeferredBoot | null {
  if (path === "/check-your-answer") return "any";
  if (variant !== "mobile") return null;
  if (/^\/(notes|topic-hub)\/[^/]+$/.test(path)) return "narrow";
  if (path === "/exam-trends" || /^\/highly-probable\/[^/]+\/[^/]+$/.test(path)) return "narrow";
  return null;
}

/**
 * The deferred boot loader: a classic inline script, ES5, no dependencies. Once the browser reports
 * the FIRST CONTENTFUL PAINT (a `paint` PerformanceObserver; then a task) it adds the page's route
 * `modulepreload` links and imports the entry module, once. Where paint timing is not available it
 * falls back to the first animation frame.
 *
 * WHY THE PAINT AND NOT THE FRAME (measured, /check-your-answer): on a busy phone, and on the
 * measuring host, a requestAnimationFrame callback ran ~300 ms before that frame was presented, so
 * the entry started BEFORE first paint and Lighthouse charged it to FCP and LCP (B LCP +0.5 s in 3 of
 * 5 runs). PR-1's 200 ms timer had the same flaw. A HIDDEN page never paints, so it starts at once, as
 * does a page hidden before its first paint. A 10 s timer is only a safety net. A "narrow" page on a
 * viewport >= 1024 px is not hydrated: it starts at once.
 */
export const BOOT_LOADER =
  "(function(s){var d=0;function go(){if(d)return;d=1;" +
  'var p=(s.getAttribute("data-preload")||"").split(" ");' +
  'for(var i=0;i<p.length;i++){if(!p[i])continue;var l=document.createElement("link");' +
  'l.rel="modulepreload";l.crossOrigin="anonymous";l.href=p[i];document.head.appendChild(l);}' +
  'import(s.getAttribute("data-entry"));}' +
  'if(s.getAttribute("data-boot")==="narrow"&&window.matchMedia&&window.matchMedia("(min-width: 1024px)").matches){go();return;}' +
  'if(document.visibilityState==="hidden"){go();return;}' +
  'document.addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden")go();});' +
  "var P=window.PerformanceObserver,w=0;" +
  'try{if(P&&P.supportedEntryTypes&&P.supportedEntryTypes.indexOf("paint")>=0){' +
  'new P(function(l,o){var e=l.getEntries();for(var i=0;i<e.length;i++){if(e[i].name==="first-contentful-paint"){o.disconnect();setTimeout(go,0);}}})' +
  '.observe({type:"paint",buffered:true});w=1;}}catch(x){}' +
  "if(!w){if(window.requestAnimationFrame)requestAnimationFrame(function(){setTimeout(go,0);});else go();}" +
  "setTimeout(go,10000);})(document.currentScript);";

/**
 * Move the entry `<script type="module">` and the route preloads out of the markup into one
 * inline boot script at the end of the body (BOOT_LOADER). The first paint then never waits for,
 * or shares the main thread with, the entry: on the unthrottled run Lighthouse simulates from,
 * the ~330 KB entry otherwise finishes and runs before Chrome's first frame, and every slow
 * profile is charged for it (PR-1 round 1).
 */
export function withDeferredBoot(
  html: string,
  entryTag: string,
  entrySrc: string,
  hrefs: readonly string[],
  boot: DeferredBoot,
): string {
  const tags = html.split(entryTag).length - 1;
  if (tags !== 1) {
    throw new Error(`applyPrerendered: expected the entry <script type="module"> exactly once to defer it, found ${tags}`);
  }
  const bodyCloses = html.split("</body>").length - 1;
  if (bodyCloses !== 1) {
    throw new Error(`applyPrerendered: expected exactly one </body> to insert the boot script, found ${bodyCloses}`);
  }
  const script =
    `<script id="${BOOT_SCRIPT_ID}" data-boot="${boot}" data-entry="${entrySrc}" data-preload="${hrefs.join(" ")}">` +
    `${BOOT_LOADER}</script>`;
  return html.replace(entryTag, () => "").replace("</body>", () => `${script}</body>`);
}

/** The shell's entry module tag, exactly as Vite wrote it (null when absent). */
export function entryScriptTagOf(shellHtml: string): { tag: string; src: string } | null {
  const match = shellHtml.match(/<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]*assets\/[^"/]+\.js)"[^>]*><\/script>/);
  return match ? { tag: match[0], src: match[1] } : null;
}

/** A built page's deferred boot script, or null when it boots from a head module script. */
export function bootScriptIn(html: string): { boot: string; entry: string; preloads: string[] } | null {
  const match = html.match(
    new RegExp(`<script id="${BOOT_SCRIPT_ID}" data-boot="([^"]*)" data-entry="([^"]*)" data-preload="([^"]*)">`),
  );
  return match ? { boot: match[1], entry: match[2], preloads: match[3].split(" ").filter(Boolean) } : null;
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
  const call = entryCode.match(new RegExp(`import\\("\\./${escaped}"\\),__vite__mapDeps\\(\\[([0-9,]*)\\]`));
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
 * LOW-END-3 PR-1 (d), controller D63a: the ONLY route whose own CSS is inlined.
 *
 * ★ WHY AN ALLOWLIST. Inlining every route's CSS also put `katex-*.css` (~8 KB br) into each
 * Notes and HPQ page and measurably delayed their first paint (B FCP +0.18–0.30 s, C FCP
 * +0.02–0.08 s). /check-your-answer is the one page whose layout shifts without its route CSS
 * (#963 §4.5), so it is the one page that gets it.
 */
export const INLINE_ROUTE_CSS_MODULES: readonly string[] = ["CheckYourAnswerPage"];

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
    for (const file of dynamicImportCssOf(entryCode, resolveRouteChunk(moduleName, assetFiles))) {
      if (file.startsWith(`${moduleName}-`) && !css.includes(file)) css.push(file);
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
): { failures: string[]; mobileFiles: number; desktopFiles: number; preloadLinks: number } {
  const failures: string[] = [];
  let mobileFiles = 0;
  let desktopFiles = 0;
  let preloadLinks = 0;
  // The entry every deferred boot must import: the one `__shell.html` (no body) still loads.
  const shellFile = join(outDir, SPA_SHELL);
  const entrySrc = existsSync(shellFile) ? (entryScriptTagOf(readFileSync(shellFile, "utf8"))?.src ?? null) : null;
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
      // LOW-END-3 PR-2 (D74): a hydrated file boots after the first frame, every other file as
      // before. Its route preloads then live in the boot script, and are checked below as links.
      const boot = bootScriptIn(html);
      const wantBoot = deferredBootFor(path, variant);
      if (wantBoot !== null && entrySrc !== null) {
        if (!boot || boot.boot !== wantBoot || boot.entry !== entrySrc || html.split(`id="${BOOT_SCRIPT_ID}"`).length !== 2) {
          failures.push(`${path}: the ${variant} file ${file} does not boot the entry ${entrySrc} once, after the first frame ("${wantBoot}")`);
        }
        if (/<script\b[^>]*\btype="module"/.test(html) || modulepreloadHrefsIn(html).length > 0) {
          failures.push(`${path}: the ${variant} file ${file} still starts JS before the first frame (module script or modulepreload in the markup)`);
        }
      } else if (boot) {
        failures.push(`${path}: the ${variant} file ${file} defers its boot but is not hydrated (deferredBootFor is null)`);
      }
      const hrefs = [...modulepreloadHrefsIn(html), ...(boot?.preloads ?? [])];
      if (routeChunkModulesFor(path).length > 0 && hrefs.length === 0) {
        failures.push(`${path}: the ${variant} file ${file} carries no modulepreload for its route chunk`);
      }
      for (const href of hrefs) {
        const target = join(outDir, href.replace(/^\/(?:[^/]*\/)?assets\//, "assets/"));
        if (!/\/assets\/[^/]+\.js$/.test(href) || !existsSync(target) || !statSync(target).isFile()) {
          failures.push(`${path}: the ${variant} file ${file} preloads ${href}, which this build did not emit`);
        }
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
  return { failures, mobileFiles, desktopFiles, preloadLinks };
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
}

export interface ApplyOptions {
  /**
   * Resolve and insert `<link rel="modulepreload">` (D4). Default true. Only a synthetic
   * build with no real `assets/` passes false — the real build never does.
   */
  preloads?: boolean;
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
    return { applied: 0, filesWritten: 0, desktopFilesWritten: 0, bodyBytes: 0, preloadLinks: 0 };
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
    const fragment = readFileSync(fragmentPathFor(path, prerenderedDir), "utf8");
    const desktopFragment = readFileSync(desktopFragmentPathFor(path, prerenderedDir), "utf8");
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
  // LOW-END-3 PR-2 (D74): hydrated files start the app after the first frame.
  const entryScript = options.preloads !== false ? entryScriptTagOf(cleanShell) : null;
  const finish = (path: string, html: string, hrefs: readonly string[], variant: "mobile" | "desktop"): string => {
    const styled = withRouteStyles(html, routeStyles.get(path) ?? []);
    const boot = deferredBootFor(path, variant);
    return boot !== null && entryScript !== null
      ? withDeferredBoot(styled, entryScript.tag, entryScript.src, hrefs, boot)
      : withPreloads(styled, hrefs);
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
      writeFileSync(file, finish(path, shell.replace(EMPTY_ROOT, `<div id="root">${fragment}</div>`), hrefs, "mobile"), "utf8");
      filesWritten += 1;
    }
    const desktopFile = join(outDir, desktopVariantFile(path));
    mkdirSync(dirname(desktopFile), { recursive: true });
    const desktopFragment = desktopFragments.get(path) as string;
    writeFileSync(
      desktopFile,
      finish(path, stamped.replace(EMPTY_ROOT, `<div id="root">${desktopFragment}</div>`), hrefs, "desktop"),
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
  };
}

async function main(): Promise<void> {
  const outDir = await resolveOutDir();
  const { applied, filesWritten, desktopFilesWritten, bodyBytes, preloadLinks } = applyArtifact(outDir);

  // ★ Names its subject on every run, green included: a run that silently applied
  // nothing must be visible in the build log rather than reading as success.
  // eslint-disable-next-line no-console
  console.log(
    `STATIC_BODIES_APPLY: outDir=${outDir} advertised=${sitemapPaths().length} ` +
      `applied=${applied} (root included) files=${filesWritten} desktop_files=${desktopFilesWritten} ` +
      `shell=${SPA_SHELL} body_bytes_total=${bodyBytes} preload_links_per_page_total=${preloadLinks}`,
  );

  // ★ PINS (a) + (d) AGAINST THIS REAL BUILD — re-read from disk, independent of the writer.
  // Skipped only in the pre-capture state, where nothing was applied to verify.
  if (applied > 0) {
    const verified = verifyBuiltPages(outDir, applicablePaths());
    // eslint-disable-next-line no-console
    console.log(
      `PRERENDER_DEVICE_VERIFY: pages=${applicablePaths().length} mobile_files=${verified.mobileFiles} ` +
        `desktop_files=${verified.desktopFiles} modulepreload_links=${verified.preloadLinks} ` +
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
