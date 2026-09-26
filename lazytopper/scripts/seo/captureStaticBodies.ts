/**
 * CAPTURE THE RENDERED BODY INTO EVERY ADVERTISED SHELL — so a crawler that does
 * not run JavaScript can read the page.
 *
 * ★ WHY THIS EXISTS. No major AI crawler executes JS. GPTBot, ClaudeBot,
 * PerplexityBot and OAI-SearchBot fetch raw HTML and stop, and every advertised
 * LazyTopper URL serves a body of `<div id="root"></div>`. Google renders and has
 * indexed the chapter pages; nobody else can read the site at all. This step
 * renders each advertised page in a real browser and writes the resulting DOM
 * into the emitted shell, so the content is in the HTML itself.
 *
 * ⚠ THIS STEP MUST RUN **AFTER** `writeStaticHeads`, AND THAT ORDER IS LOAD-BEARING.
 * `writeStaticHeads` reads the built shell ONCE and stamps every advertised page
 * from that one string. A body written into the template BEFORE that step is
 * therefore copied into all 116 files — every page carrying the home page's DOM
 * under its own correct title, which is a GREEN build with wrong content. Running
 * last is what makes each page's body its own. `PAIRWISE-DISTINCT` below is the
 * assertion that keeps it that way rather than trusting the order.
 *
 * ★ THE ROOT IS DELIBERATELY NOT CAPTURED — owner ruling, 2026-09-16.
 * `RootEntry` (`src/App.tsx`) serves `Welcome` to a signed-out visitor and
 * `DesktopHome` to a signed-in one: `/` is not one page with auth-dependent chrome
 * on it, it is TWO DIFFERENT PAGES. Stripping chrome cannot reconcile that — a
 * signed-in student loading `/app/` would see the entire marketing landing page
 * before their dashboard, which is the "signed-in student sees signed-out chrome"
 * glitch at whole-page scale, on a route signed-in students hit constantly. So the
 * homepage keeps its empty body and needs a different answer than this one. That
 * is a real, stated cost: `/app/` is one of only two pages Google has indexed.
 * `sitemapPaths()` yields 59; this step covers the 58 that are not the root,
 * including all 26 chapters and all 26 notes.
 *
 * ★ AUTH-DEPENDENT CHROME IS REMOVED AS **DOM NODES**, NEVER AS TEXT, and that
 * distinction is not stylistic — it is the difference between a correct page and
 * silently corrupted CBSE content. Two advertised pages contain the target strings
 * INSIDE ORDINARY WORDS:
 *
 *   /topic-hub/areas-related-to-circles  "Split a shaded de(sign in)to standard pieces"
 *   /notes/chemical-reactions-and-equations  "Balance by the hit-and-(trial) method"
 *
 * A `replace("sign in")` / `replace("trial")` over the serialized HTML would mangle
 * both, in a static file, with every gate still green. So every strip below either
 * selects structurally (an `href`, a `data-testid`) or matches a node's COMPLETE
 * normalized text — never a substring of running prose. `SUBSTRING_TRAP_WITNESSES`
 * asserts both sentences survive the strip intact.
 *
 * ⚠ THE COMPONENTS ARE NOT MODIFIED TO MAKE THIS WORK. Everything under `src/` stays
 * byte-identical; the stripping happens on the captured DOM. React re-renders the
 * real chrome on boot for whoever the visitor actually is, so nobody is ever shown
 * a state that is false for them.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { join, resolve, extname, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { AddressInfo } from "node:net";
import { chromium, type Browser, type Page } from "@playwright/test";
import { sitemapPaths } from "../../src/config/sitemapUrls";

const LAZYTOPPER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Where the captured artifact is written, and then COMMITTED.
 *
 * Deliberately not the build output: root `.gitignore` carries a bare `dist`, which
 * matches `artifacts/lazytopper-app/dist/public/app/**`, so the emitted directory
 * cannot be committed at all. And deliberately not `public/`: `writeStaticHeads`
 * stamps all 116 files AFTER vite copies `public/`, so anything staged there is
 * silently overwritten.
 */
export const PRERENDERED_DIR = resolve(LAZYTOPPER_ROOT, "prerendered");

/**
 * The entry chunk this build produced, as `assets/index-XXXXXXXX.js`.
 *
 * ★ THIS IS THE STALENESS FINGERPRINT. Vite content-hashes the filename, and the entry
 * chunk embeds the hashed filenames of its lazy children (76 of them in the current
 * build), so a change anywhere in the render graph — a note spec, the question bank, a
 * component — renames a child, changes the entry's bytes, and moves this name.
 */
export function entryChunkOf(outDir: string): string {
  const shell = readFileSync(join(outDir, "index.html"), "utf8");
  const match = shell.match(/<script[^>]+src="[^"]*\/(assets\/[^"]+\.js)"/);
  if (!match) {
    throw new Error(
      `captureStaticBodies: no entry script found in ${join(outDir, "index.html")} — ` +
        `cannot record a staleness fingerprint for the artifact.`,
    );
  }
  return match[1];
}

/** The mount point in the built shell, replaced with the captured DOM. */
const EMPTY_ROOT = '<div id="root"></div>';

/**
 * Minimum captured body size, in bytes of serialized HTML.
 *
 * ★ CHOSEN FROM MEASUREMENT, NOT TASTE. Across all 58 advertised non-root paths the
 * smallest real body measured 8,221 bytes (`/legal/refund`); the median is ~29 kB.
 * A page that rendered nothing, or rendered an error boundary, produces a few
 * hundred bytes. 4,000 sits far below every real page and far above every failure,
 * so it catches an empty render without going red the first time a legal page is
 * shortened. It is a FLOOR, not a target: the per-path assertions below are what
 * actually prove each body is the right one.
 */
export const MIN_BODY_BYTES = 4000;

/** Rendered-text length required before a page counts as "has content". */
const MIN_BODY_TEXT = 200;

/** Substrings that mean React fell over instead of rendering. */
const ERROR_BOUNDARY_MARKERS = [
  "something went wrong",
  "failed to load",
  "error boundary",
  "unexpected error",
];

/**
 * ★ THE AUTH-CHROME BAN LIST — checked CASE-INSENSITIVELY, PER PATH.
 *
 * ⚠ CASE-INSENSITIVITY IS NOT DEFENSIVE PROGRAMMING HERE, IT IS THE WHOLE POINT.
 * The signed-out button in `App.tsx` renders the source text "Log in" but is
 * displayed UPPERCASE by a `text-transform: uppercase` style, so it reads "LOG IN"
 * on the three `/legal/*` pages. A case-sensitive grep for "Log in" returns 54 of
 * the 57 pages that carry a login button and misses those three IN SILENCE — a
 * hand-written list failing quietly, which is exactly what this list exists to
 * prevent. Per-path, never in aggregate: an aggregate count of zero can hide a
 * page that was skipped entirely.
 *
 * ⚠⚠ AND EVERY ENTRY IS A DISTINCTIVE, COMPLETE PHRASE — NEVER A BARE TOKEN LIKE
 * "sign in". An earlier draft of this list banned the bare phrase and FAILED THE
 * BUILD on two pages, both of them correct:
 *
 *   /pricing                             "Browse first. Sign in for a 7-day trial."
 *                                        — invariant copy. `PricingPage` never calls
 *                                        `useAuth`; a signed-in student reads exactly
 *                                        this. It is content, not chrome.
 *   /topic-hub/areas-related-to-circles  "Split a shaded de(sign in)to standard pieces"
 *                                        — the banned token INSIDE AN ORDINARY WORD.
 *
 * So the bare login labels are NOT matched as text at all. They have no distinctive
 * phrasing to match on, so they are caught STRUCTURALLY instead — see
 * `countResidualAuthNodes`, which asserts that zero login-targeting nodes survive.
 * Text bans here; node bans there; neither pretends to do the other's job.
 */
export const BANNED_AUTH_TEXT: readonly string[] = [
  "sign in to see mistake patterns",
  "sign in →",
  "mistake-aware practice needs saved attempts",
  "start free trial",
  "good morning",
  "good afternoon",
  "good evening",
];

/**
 * Content that MUST survive the strip, proving it removed chrome and not prose.
 * Both sentences contain a banned string inside an ordinary word.
 */
export const SUBSTRING_TRAP_WITNESSES: ReadonlyArray<{ path: string; sentence: string }> = [
  {
    path: "/topic-hub/areas-related-to-circles",
    sentence: "design into standard pieces",
  },
  {
    path: "/notes/chemical-reactions-and-equations",
    sentence: "hit-and-trial",
  },
];

const MIME: Readonly<Record<string, string>> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".webmanifest": "application/manifest+json",
};

/** `build.outDir` from vite.config — the same upstream source `writeStaticHeads` reads. */
async function resolveOutDir(): Promise<string> {
  const override = process.argv.find((arg) => arg.startsWith("--out="));
  if (override) return resolve(LAZYTOPPER_ROOT, override.slice("--out=".length));

  // ⚠ SAME TRAP AS `writeStaticHeads`, AND IT CAUGHT THIS SCRIPT TOO. `vite build`
  // sets `NODE_ENV=production` INSIDE ITS OWN PROCESS, and `vite.config.ts` branches
  // `build.outDir` on exactly that: production writes to
  // `artifacts/lazytopper-app/dist/public/app`, anything else to `dist`. This is a
  // SEPARATE process in the build chain, where NODE_ENV is whatever the shell had —
  // unset, in CI and on a dev box. Without this line the script resolves `dist`, finds
  // no shell there, and FAILS THE BUILD while the real output sits untouched in
  // `artifacts/...`. Not hypothetical: it is what the first wired run of this script
  // did, a few lines below where `writeStaticHeads` records the identical scar.
  // Mirroring what `vite build` does is what makes the two agree by construction
  // rather than by both happening to see the same environment.
  process.env.NODE_ENV = process.env.NODE_ENV || "production";

  const viteConfig = (await import("../../vite.config")).default;
  const outDir = (viteConfig as { build?: { outDir?: string } }).build?.outDir;
  if (typeof outDir !== "string" || outDir.length === 0) {
    throw new Error("captureStaticBodies: vite.config.ts declares no build.outDir");
  }
  return resolve(LAZYTOPPER_ROOT, outDir);
}

/** `/app/` -> `/app`, matching how `main.tsx` feeds `<BrowserRouter basename>`. */
async function resolveBasename(): Promise<string> {
  const viteConfig = (await import("../../vite.config")).default;
  const base = (viteConfig as { base?: string }).base;
  if (typeof base !== "string" || base.length === 0) {
    throw new Error("captureStaticBodies: vite.config.ts declares no base");
  }
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

/**
 * Index every file the build actually emitted: servable URL path -> absolute path.
 *
 * ★ THIS IS WHAT MAKES THE SERVER SAFE, AND IT IS A STRUCTURE, NOT A CHECK. The
 * first version joined the decoded request path onto `outDir` and asked whether the
 * result was still inside it. That is answerable, but it keeps untrusted input
 * flowing into a filesystem API and asks a guard to catch it — CodeQL flagged
 * `js/path-injection` at HIGH on it twice, and kept flagging it after a
 * resolve-and-confine fix, because `startsWith` is not a sanitizer it recognises.
 * Arguing with the analyser would have been the wrong move anyway: the real
 * improvement is that a request path is now only ever a KEY LOOKUP in a map built by
 * walking the output directory. Nothing from the request ever reaches `readFileSync`;
 * the values come from the walk. The server can serve exactly the files the build
 * emitted and, by construction, nothing else.
 */
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

/**
 * Serve the built output the way the host does: real files win, everything else
 * falls back to the SPA shell. Bound to loopback on an ephemeral port.
 */
function serveBuiltOutput(outDir: string, basename: string): Promise<Server> {
  const index = indexBuiltOutput(outDir);
  const fallback = index.get("/index.html");
  if (!fallback) {
    throw new Error(`captureStaticBodies: no index.html under ${outDir} to serve as the shell`);
  }

  const server = createServer((req, res) => {
    let pathname = decodeURIComponent((req.url ?? "/").split("?")[0]);
    if (pathname.startsWith(`${basename}/`)) pathname = pathname.slice(basename.length);
    else if (pathname === basename) pathname = "/";
    const bare = pathname.replace(/\/$/, "");

    // Lookups only — the request never becomes a path. Order mirrors the host:
    // an exact file, then `<path>.html`, then `<path>/index.html`, then the shell.
    const file =
      index.get(pathname) ??
      index.get(`${bare}.html`) ??
      index.get(`${bare}/index.html`) ??
      fallback;

    res.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  return new Promise((resolveServer, rejectServer) => {
    server.once("error", rejectServer);
    server.listen(0, "127.0.0.1", () => resolveServer(server));
  });
}

/**
 * Whether a request path can address a file in the built output at all.
 *
 * Kept as a named, tested predicate because the property it encodes — a request can
 * only ever name something the build emitted — is the whole security argument for
 * the server above, and a property with no test is a comment.
 */
export function servableKey(
  index: ReadonlyMap<string, string>,
  pathname: string,
): string | null {
  const bare = pathname.replace(/\/$/, "");
  for (const key of [pathname, `${bare}.html`, `${bare}/index.html`]) {
    if (index.has(key)) return key;
  }
  return null;
}

interface Capture {
  path: string;
  html: string;
  text: string;
  removed: number;
  residualAuthNodes?: number;
  /** App-API endpoints this page requested while rendering. */
  apiCalls?: string[];
  /** The same page rendered with app APIs REACHABLE, for the dependence check. */
  htmlWithApis?: string;
}

/**
 * Request patterns treated as "the app's own data layer" during capture.
 *
 * Fonts and static assets are not in here on purpose: a page loading Google Fonts is
 * not data-dependent, and a guard that flagged it would be noise.
 */
const APP_API_PATTERNS = ["**/api/**", "**/shared-api/**"];

function isAppApiUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return pathname.startsWith("/api/") || pathname.startsWith("/shared-api/");
  } catch {
    return false;
  }
}

/**
 * Every advertised path this step captures — the sitemap's set, minus the root.
 * Driven from `sitemapPaths()`, never from a directory listing: the build output
 * also contains 105 `visuals/*.html` copied from `public/`, which are not
 * advertised and must not be touched.
 */
export function capturablePaths(): string[] {
  return sitemapPaths().filter((path) => path !== "/");
}

/**
 * Remove auth-dependent chrome from a rendered page, in place. Returns how many
 * nodes were removed.
 *
 * ★ NODES, NEVER TEXT. Every rule below is either structural (an `href`, a
 * `data-testid`) or matches a node's COMPLETE normalized label. Nothing here does a
 * substring replacement on prose, because two advertised pages carry the target
 * strings inside ordinary words — "de(sign in)to" and "hit-and-(trial)" — and a
 * text-level strip would corrupt CBSE content in a static file with every gate green.
 *
 * ⚠ NO VARIABLE-ASSIGNED INNER FUNCTIONS IN THIS BODY. Its source is shipped into
 * the browser via `toString()`, so an inner `const f = () => …` would carry an
 * esbuild `__name` call into a context that may not define it.
 *
 * ⚠ AND THE COMPONENTS ARE NOT TOUCHED TO MAKE THIS WORK. Everything under `src/`
 * stays byte-identical; React re-renders the real chrome on boot for whoever the
 * visitor actually is.
 */
export function stripAuthChrome(root: Element): number {
  const doomed: Element[] = [];

  // 1. The time-of-day greeting. Auth-dependent (the student's first name is
  //    appended when signed in) AND baked from the BUILD machine's clock, so a
  //    build at 3pm would greet a 7am reader with "Good afternoon".
  for (const greeting of Array.from(root.querySelectorAll('[data-testid="shell-greeting"]'))) {
    doomed.push(greeting);
  }

  // 2. Everything that links to the login route: the Mistake Intel card's signed-out
  //    CTA and the practice-hub trial upsell. For the upsell the whole enclosing
  //    <section> goes, since its copy is signed-out-only; for the card the CTA and
  //    its explanatory <p> go, leaving the card's own header, which a signed-in
  //    visitor sees too.
  for (const anchor of Array.from(root.querySelectorAll('a[href*="/login"]'))) {
    const section = anchor.closest("section");
    if (section && section !== root && root.contains(section)) {
      doomed.push(section);
      continue;
    }
    const previous = anchor.previousElementSibling;
    if (previous && previous.tagName === "P") doomed.push(previous);
    doomed.push(anchor);
  }

  // 3. The signed-out header buttons. They carry no href and no test id, so match
  //    the node's COMPLETE normalized label — "log in" as the whole button text,
  //    never as a substring. A button reading "How do I log in to my account?" is
  //    content and survives.
  for (const button of Array.from(root.querySelectorAll("button"))) {
    const label = (button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (label === "log in" || label === "login" || label === "sign in") doomed.push(button);
  }

  // 4. CLOCK-DERIVED FIGURES (PRICING-TB-1, owner ruling OR-P1). Not auth chrome, but
  //    the same hazard as the greeting: a value computed from the BUILD machine's
  //    clock would be frozen into a static file and read as true for months. The
  //    components write these figures only after mount and wrap every one of them in
  //    a single node carrying the test id, so the whole node goes — structurally,
  //    never by text ("months", "save" and "boards" are ordinary words in content).
  //      · till-boards-figures — /pricing's one-time price, struck full price, month
  //        label and saving (PricingPage `TillBoardsOffer`).
  //      · boards-countdown — the landing's "N months" figure (Welcome.tsx). Prepared
  //        in advance: the root is not captured today (`capturablePaths()`), and this
  //        is the rule Welcome.tsx's own comment asks whoever captures it to add.
  //    ⚠ The selector is inlined, not a module constant: this body ships to the
  //    browser via `toString()` and cannot see module scope.
  for (const figure of Array.from(
    root.querySelectorAll('[data-testid="till-boards-figures"], [data-testid="boards-countdown"]'),
  )) {
    doomed.push(figure);
  }

  let removed = 0;
  for (const node of doomed) {
    if (node.parentNode) {
      node.remove();
      removed += 1;
    }
  }
  return removed;
}

/**
 * How many auth-chrome nodes are STILL present after the strip.
 *
 * ★ THIS IS THE CHECK THAT CATCHES THE BARE LOGIN BUTTONS. They have no distinctive
 * wording to grep for — "Log in" is two common words — so banning them as text would
 * mean banning a token that legitimately appears in content and inside other words.
 * Structure is the honest instrument for them: after a correct strip, ZERO nodes in
 * the captured DOM link to the login route, carry the greeting's test id, or read as
 * a bare login button.
 */
export function countResidualAuthNodes(root: Element): number {
  let residual = root.querySelectorAll('a[href*="/login"]').length;
  residual += root.querySelectorAll('[data-testid="shell-greeting"]').length;
  // Clock-derived figures (strip rule 4, PRICING-TB-1 OR-P1) — none may survive.
  residual += root.querySelectorAll(
    '[data-testid="till-boards-figures"], [data-testid="boards-countdown"]',
  ).length;
  for (const button of Array.from(root.querySelectorAll("button"))) {
    const label = (button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (label === "log in" || label === "login" || label === "sign in") residual += 1;
  }
  return residual;
}

/**
 * Remove auth-dependent chrome from the live DOM, then serialize.
 *
 * Runs inside the page. Every rule is structural (an `href`, a `data-testid`) or
 * matches a node's COMPLETE normalized text — never a substring of prose.
 */
async function captureBody(page: Page): Promise<{ html: string; text: string; removed: number }> {
  // ★ THE STRIP IS SHIPPED INTO THE PAGE AS SOURCE, so the function the browser runs
  // is THE SAME ONE the guard test drives under jsdom. A second, in-page copy of
  // these rules would agree with the tested one on the day it was written and drift
  // silently afterwards — and "silently" is the entire failure mode of this step.
  //
  // ⚠ `__name` IS PASSED IN DELIBERATELY. `tsx`/esbuild compiles with `keepNames`,
  // which can emit calls to a `__name` helper inside the function body; that helper
  // does not exist in the browser, and without this the page throws
  // `ReferenceError: __name is not defined` on every path with the build otherwise
  // healthy. Supplying it as a parameter makes the shipped source self-contained.
  return page.evaluate(
    ([stripSource, residualSource]) => {
      const root = document.getElementById("root");
      if (!root) return { html: "", text: "", removed: 0, residualAuthNodes: 0 };

      const strip = new Function("__name", `return (${stripSource})`)((fn: unknown) => fn);
      const countResidual = new Function("__name", `return (${residualSource})`)(
        (fn: unknown) => fn,
      );
      const removed = strip(root) as number;

      return {
        html: root.innerHTML,
        text: (root as HTMLElement).innerText || "",
        removed,
        residualAuthNodes: countResidual(root) as number,
      };
    },
    [stripAuthChrome.toString(), countResidualAuthNodes.toString()] as const,
  );
}

async function capturePath(
  browser: Browser,
  origin: string,
  basename: string,
  path: string,
  blockApis: boolean,
): Promise<Capture> {
  // ★ A FRESH CONTEXT PER PATH. Contexts do not share storage, and these pages DO
  // write it while rendering (a daily-check key, a last-subject key, the local auth
  // key), so a reused context would let one page's writes change the next page's
  // render. Measured: 58 paths captured concurrently are byte-identical to the same
  // 58 captured serially, with a control proving the comparison detects a real
  // difference. Correctness is not what the concurrency is for.
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const page = await context.newPage();
    const apiCalls = new Set<string>();
    page.on("request", (request) => {
      if (isAppApiUrl(request.url())) apiCalls.add(new URL(request.url()).pathname);
    });
    // ★ WITH `blockApis`, THE APP'S DATA LAYER IS UNREACHABLE, so whatever renders
    // cannot have come from it. That is what makes the committed artifact provably a
    // function of source rather than of whatever the API returned the day it ran.
    if (blockApis) {
      for (const pattern of APP_API_PATTERNS) {
        await page.route(pattern, (route) => route.abort());
      }
    }
    const url = `${origin}${basename}${path}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForFunction(
      (minText) => {
        const root = document.getElementById("root");
        return Boolean(
          root && root.children.length > 0 && (root as HTMLElement).innerText.trim().length > minText,
        );
      },
      MIN_BODY_TEXT,
      { timeout: 30_000 },
    );
    // ⚠ NETWORK-IDLE AND A TEXT FLOOR ARE NOT "FINISHED RENDERING", AND TRUSTING THEM
    // PRODUCED A WRONG ARTIFACT. The sidebar nav alone clears a 200-character floor, so on
    // a loaded machine the wait above can return while the page body is still empty — a
    // notes page captured at 7,977 bytes instead of 151,156. It surfaced only because the
    // data-dependence control renders twice and the two runs disagreed wildly; a
    // single-render capture would have committed the chrome-only page and every gate would
    // have stayed green.
    //
    // So wait for the rendered text to STOP CHANGING: three consecutive identical samples.
    // "Has it settled" is the actual question; "is it bigger than N" never was.
    let previous = -1;
    let settled = 0;
    for (let tick = 0; tick < 60 && settled < 3; tick += 1) {
      const length = await page.evaluate(
        () => (document.getElementById("root") as HTMLElement | null)?.innerText.length ?? 0,
      );
      if (length === previous) settled += 1;
      else {
        settled = 0;
        previous = length;
      }
      await page.waitForTimeout(150);
    }
    if (settled < 3) {
      throw new Error(
        `captureStaticBodies: ${path} never stopped re-rendering (last length ${previous}); ` +
          `capturing it would freeze an arbitrary intermediate frame.`,
      );
    }

    const captured = await captureBody(page);
    return { path, ...captured, apiCalls: [...apiCalls].sort() };
  } finally {
    await context.close();
  }
}

/**
 * The captured SET is exactly the set that should have been captured.
 *
 * ★ SEPARATE FROM `validateCaptures` ON PURPOSE. That function answers "is each
 * captured page good?", which is vacuously true of a page that was never captured
 * at all — a family silently dropped from the loop leaves every remaining capture
 * perfect and every page in that family still serving an empty body. This answers
 * "did we capture everything?", and it is the only check that can catch a
 * disappearance. It also guarantees the two substring-trap witnesses are present,
 * so their content assertions in `validateCaptures` can never go vacuous.
 */
export function validateCoverage(captures: readonly Capture[]): string[] {
  const failures: string[] = [];
  const captured = new Set(captures.map((capture) => capture.path));
  const expected = capturablePaths();

  for (const path of expected) {
    if (!captured.has(path)) failures.push(`${path}: advertised but never captured`);
  }
  for (const path of captured) {
    if (!expected.includes(path)) {
      failures.push(`${path}: captured but not an advertised, capturable path`);
    }
  }
  for (const witness of SUBSTRING_TRAP_WITNESSES) {
    if (!captured.has(witness.path)) {
      failures.push(
        `${witness.path}: the substring-trap witness is missing, so the check that the ` +
          `strip preserves content cannot run`,
      );
    }
  }
  return failures;
}

/** Every failure this step can detect, collected so the build reports ALL of them. */
export function validateCaptures(captures: readonly Capture[]): string[] {
  const failures: string[] = [];

  for (const capture of captures) {
    if ((capture.residualAuthNodes ?? 0) > 0) {
      failures.push(
        `${capture.path}: ${capture.residualAuthNodes} auth-chrome node(s) survived the ` +
          `strip (a login link, the greeting, or a bare login button)`,
      );
    }

    const bytes = Buffer.byteLength(capture.html, "utf8");
    if (bytes < MIN_BODY_BYTES) {
      failures.push(
        `${capture.path}: captured body is ${bytes} bytes, under the ${MIN_BODY_BYTES}-byte floor`,
      );
    }

    const haystack = `${capture.html}\n${capture.text}`.toLowerCase();
    for (const marker of ERROR_BOUNDARY_MARKERS) {
      if (haystack.includes(marker)) {
        failures.push(`${capture.path}: captured an error boundary ("${marker}")`);
      }
    }

    // Per path, case-insensitive — never an aggregate count, which can read zero
    // because a page was skipped rather than because it was clean.
    for (const banned of BANNED_AUTH_TEXT) {
      if (capture.text.toLowerCase().includes(banned)) {
        failures.push(`${capture.path}: auth chrome survived the strip ("${banned}")`);
      }
    }
  }

  // ★★ RUNTIME-DATA DEPENDENCE — the one input no source fingerprint can ever cover.
  // A page whose DOM changes when the app's API is unreachable is a page whose captured
  // copy is a photograph of one response, and it will drift silently while every other
  // guard here stays green. Rendering twice and comparing is the only way to see it.
  //
  // ⚠ MEASURED BEFORE THIS WAS WRITTEN, and it changed the design. Today EVERY page
  // requests `/api/cbse-exam-date` — App.tsx's daily pace-profile init runs on every
  // route — so the originally-specified rule, "fail if a page calls an app API", would
  // have failed all 58 pages on day one. The DOM is byte-identical with that call
  // aborted, on every page tested, so the call does not feed rendering. Comparing
  // OUTPUT rather than counting REQUESTS is what distinguishes the two.
  for (const capture of captures) {
    if (capture.htmlWithApis !== undefined && capture.htmlWithApis !== capture.html) {
      failures.push(
        `${capture.path}: rendered output DEPENDS ON A RUNTIME API RESPONSE — the DOM ` +
          `differs when the app's API is unreachable (${Buffer.byteLength(capture.html)} vs ` +
          `${Buffer.byteLength(capture.htmlWithApis)} bytes). A prerendered page must be a ` +
          `function of source, or its captured copy freezes one response and drifts in ` +
          `silence. Endpoints this page called: ${(capture.apiCalls ?? []).join(", ") || "none"}`,
      );
    }
  }

  // ★ PAIRWISE-DISTINCT. This is the assertion against the failure mode that makes
  // this whole step dangerous: one page's DOM propagated into every file, each under
  // its own correct title, with the build green. Identical bodies on two different
  // URLs cannot be right.
  const seen = new Map<string, string>();
  for (const capture of captures) {
    const previous = seen.get(capture.html);
    if (previous) {
      failures.push(
        `${capture.path}: captured body is byte-identical to ${previous} — one page's DOM ` +
          `has been written to another's file`,
      );
    } else {
      seen.set(capture.html, capture.path);
    }
  }

  // The strip removed chrome, not prose. Absence of a witness path is a COVERAGE
  // question, answered by `validateCoverage` — not a defect in a capture that is
  // simply not in this set.
  for (const witness of SUBSTRING_TRAP_WITNESSES) {
    const capture = captures.find((candidate) => candidate.path === witness.path);
    if (!capture) continue;
    if (!capture.text.includes(witness.sentence)) {
      failures.push(
        `${witness.path}: content "${witness.sentence}" did not survive the strip — the ` +
          `removal is matching text instead of nodes`,
      );
    }
  }

  return failures;
}

async function main(): Promise<void> {
  const outDir = await resolveOutDir();
  const basename = await resolveBasename();

  const templatePath = join(outDir, "index.html");
  if (!existsSync(templatePath)) {
    throw new Error(
      `captureStaticBodies: no built shell at ${templatePath}. This step runs AFTER ` +
        `vite build AND after writeStaticHeads, and captures into the files they emit.`,
    );
  }

  // The root is excluded by owner ruling — see the header note.
  const advertised = capturablePaths();
  if (advertised.length === 0) {
    throw new Error(
      "captureStaticBodies: no advertised paths to capture. Every page would keep an " +
        "empty body, which is the condition this step exists to end.",
    );
  }

  const server = await serveBuiltOutput(outDir, basename);
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const captures: Capture[] = [];
  // ⚠ THE SERVER IS CLOSED ON EVERY PATH OUT OF HERE, INCLUDING A FAILED BROWSER
  // LAUNCH, AND THAT OUTER `try` IS NOT TIDINESS. `chromium.launch()` used to sit
  // OUTSIDE it: on a machine with no browser downloaded the launch threw in ONE
  // SECOND, printed the right error — and then the build HUNG, because the still
  // listening server kept the event loop alive so the process never exited on its
  // `exitCode = 1`. CI sat on that step for fifty minutes with the diagnosis already
  // in the log. A loud failure that never terminates is not a loud failure.
  try {
    const browser = await chromium.launch();
    try {
      const CONCURRENCY = 4;
      for (let index = 0; index < advertised.length; index += CONCURRENCY) {
        const batch = advertised.slice(index, index + CONCURRENCY);
        const settled = await Promise.all(
          batch.map(async (path) => {
            try {
              // ★ EVERY PAGE IS RENDERED TWICE, AND THAT IS THE DATA-DEPENDENCE CONTROL.
              // The committed artifact is the run with the app's APIs UNREACHABLE, so it
              // cannot contain runtime data. The second run, with them reachable, is the
              // control: if the two DOMs differ, this page's rendered output depends on
              // something no source fingerprint can cover, and the capture fails.
              const blocked = await capturePath(browser, origin, basename, path, true);
              const live = await capturePath(browser, origin, basename, path, false);
              return { ...blocked, htmlWithApis: live.html };
            } catch (error: unknown) {
              throw new Error(`captureStaticBodies: ${path} failed to render — ${String(error)}`);
            }
          }),
        );
        captures.push(...settled);
      }
    } finally {
      await browser.close();
    }
  } finally {
    await new Promise<void>((done) => server.close(() => done()));
  }

  const failures = [...validateCoverage(captures), ...validateCaptures(captures)];
  if (failures.length > 0) {
    throw new Error(
      `captureStaticBodies: ${failures.length} page(s) failed validation. NOTHING WAS ` +
        `WRITTEN — a plausible-looking build with the wrong content in it is worse than ` +
        `no build.\n  - ${failures.join("\n  - ")}`,
    );
  }

  // ★ THE OUTPUT IS THE COMMITTED ARTIFACT, NOT THE BUILD. This step no longer writes
  // into `dist`: it writes body fragments that get COMMITTED, and `applyPrerendered`
  // puts them into the build on every platform. The split exists because a headless
  // browser cannot run on Vercel or in the Railway container (the system libraries are
  // absent and `--with-deps` shells out to apt-get, which Amazon Linux does not have),
  // while GitHub Actions runs it fine. So capture happens once, in CI; every build just
  // copies the result.
  //
  // ★ FRAGMENTS, NOT WHOLE PAGES, AND THE REASON IS CHURN. A whole page embeds the entry
  // bundle's content hash, which moves on ANY code change — committing pages would
  // rewrite all 116 files on every merge that touches `src/`, whether or not a word of
  // content changed, and the artifact would be permanent review noise. A fragment
  // carries no entry hash, so it changes only when the rendered content changes, which
  // also makes the diff readable: a notes PR shows the sentences that moved.
  //
  // One fragment per path, not two: the two files `writeStaticHeads` emits per path are
  // byte-identical (verified across all 58 pairs), so `applyPrerendered` fills both from
  // one fragment.
  rmSync(PRERENDERED_DIR, { recursive: true, force: true });
  let filesWritten = 0;
  for (const capture of captures) {
    const file = join(PRERENDERED_DIR, `${capture.path.replace(/^\//, "")}.html`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, capture.html, "utf8");
    filesWritten += 1;
  }

  // ★ THE MANIFEST RECORDS WHAT IS PLATFORM-STABLE, AND NOTHING ELSE.
  //
  // ⚠ IT USED TO CARRY THE ENTRY CHUNK'S CONTENT HASH AS A STALENESS FINGERPRINT, AND
  // THAT WAS WRONG — measured on this PR's first CI run. The 58 fragments captured on
  // Windows and on the Linux runner are BYTE-IDENTICAL, all 58 of them; the entry chunk's
  // hash is NOT (`index-BB9fgdcp.js` vs `index-B4La6Rbv.js`). The bundle is not
  // reproducible across platforms, so that field measured WHICH MACHINE BUILT THIS as
  // much as whether the source had moved, and it would have reported permanent, false
  // staleness for anyone capturing off the CI runner.
  //
  // It was also a PROXY for something the artifact already answers exactly. Freshness is
  // "do the committed fragments match what this source renders" — compare the fragments.
  // A source change that alters rendered output changes them and is caught; a source
  // change that alters no rendered output leaves the artifact CORRECT, and failing on it
  // would be noise. The fragment comparison is both platform-stable and more precise than
  // the fingerprint it replaced.
  //
  // What stays here is what review needs and what is stable everywhere: the path set, and
  // the app-API endpoints observed, so a newly-introduced one shows up as a diff line even
  // when it changes no rendering.
  writeFileSync(
    join(PRERENDERED_DIR, "manifest.json"),
    `${JSON.stringify(
      {
        note:
          "Generated by `pnpm seo:capture`. Do not edit by hand. Freshness is checked by " +
          "re-capturing and comparing the fragments, which are byte-identical across " +
          "platforms; the bundle hash is NOT, so it is deliberately not recorded here.",
        // ★ RECORDED SO A NEW ONE IS VISIBLE IN REVIEW. The DOM-equality check above is
        // what FAILS the build; this list is what makes a newly-introduced endpoint show
        // up as a diff line in the committed artifact, rather than passing unnoticed
        // because it happened not to change any rendering.
        appApiCallsObserved: [
          ...new Set(captures.flatMap((capture) => capture.apiCalls ?? [])),
        ].sort(),
        paths: captures.map((capture) => capture.path).sort(),
      },
      null,
      2,
    )}
`,
    "utf8",
  );
  filesWritten += 1;

  const bytes = captures.map((capture) => Buffer.byteLength(capture.html, "utf8"));
  const removed = captures.reduce((total, capture) => total + capture.removed, 0);
  // ★ Names its subject on every run, green included: a run that silently captured
  // nothing must be visible in the build log rather than reading as success.
  // eslint-disable-next-line no-console
  console.log(
    `STATIC_BODIES_CAPTURE: artifact=${PRERENDERED_DIR} ` +
      `advertised=${sitemapPaths().length} captured=${captures.length} (root excluded) ` +
      `files=${filesWritten} auth_nodes_removed=${removed} ` +
      `body_bytes_min=${Math.min(...bytes)} body_bytes_max=${Math.max(...bytes)} ` +
      `entry=${entryChunkOf(outDir)}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  });
}
