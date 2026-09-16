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

import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { join, resolve, extname, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { AddressInfo } from "node:net";
import { chromium, type Browser, type Page } from "@playwright/test";
import { sitemapPaths } from "../../src/config/sitemapUrls";

const LAZYTOPPER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

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
 * Serve the built output the way the host does: real files win, everything else
 * falls back to the SPA shell. Bound to loopback on an ephemeral port.
 */
function serveBuiltOutput(outDir: string, basename: string): Promise<Server> {
  const server = createServer((req, res) => {
    let pathname = decodeURIComponent((req.url ?? "/").split("?")[0]);
    if (pathname.startsWith(`${basename}/`)) pathname = pathname.slice(basename.length);
    else if (pathname === basename) pathname = "/";

    const file = [
      join(outDir, pathname),
      join(outDir, `${pathname.replace(/\/$/, "")}.html`),
      join(outDir, pathname, "index.html"),
      join(outDir, "index.html"), // SPA fallback, exactly as the host serves it
    ].find(isReadableFile);

    if (!file) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  return new Promise((resolveServer, rejectServer) => {
    server.once("error", rejectServer);
    server.listen(0, "127.0.0.1", () => resolveServer(server));
  });
}

function isReadableFile(candidate: string): boolean {
  try {
    return statSync(candidate).isFile();
  } catch {
    return false;
  }
}

interface Capture {
  path: string;
  html: string;
  text: string;
  removed: number;
  residualAuthNodes?: number;
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
    const captured = await captureBody(page);
    return { path, ...captured };
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
  const browser = await chromium.launch();

  const captures: Capture[] = [];
  try {
    const CONCURRENCY = 4;
    for (let index = 0; index < advertised.length; index += CONCURRENCY) {
      const batch = advertised.slice(index, index + CONCURRENCY);
      const settled = await Promise.all(
        batch.map(async (path) => {
          try {
            return await capturePath(browser, origin, basename, path);
          } catch (error: unknown) {
            throw new Error(`captureStaticBodies: ${path} failed to render — ${String(error)}`);
          }
        }),
      );
      captures.push(...settled);
    }
  } finally {
    await browser.close();
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

  // Only now, with every page validated, touch the emitted files. Both files per
  // path: `<path>.html` and `<path>/index.html`, exactly as writeStaticHeads wrote them.
  let filesWritten = 0;
  for (const capture of captures) {
    const relative = capture.path.replace(/^\//, "");
    for (const target of [`${relative}.html`, join(relative, "index.html")]) {
      const file = join(outDir, target);
      const shell = readFileSync(file, "utf8");
      if (!shell.includes(EMPTY_ROOT)) {
        throw new Error(
          `captureStaticBodies: ${target} has no empty mount point to fill. The shell ` +
            `changed shape, or this step ran twice.`,
        );
      }
      writeFileSync(file, shell.replace(EMPTY_ROOT, `<div id="root">${capture.html}</div>`), "utf8");
      filesWritten += 1;
    }
  }

  const bytes = captures.map((capture) => Buffer.byteLength(capture.html, "utf8"));
  const removed = captures.reduce((total, capture) => total + capture.removed, 0);
  // ★ Names its subject on every run, green included: a run that silently captured
  // nothing must be visible in the build log rather than reading as success.
  // eslint-disable-next-line no-console
  console.log(
    `STATIC_BODIES: outDir=${outDir} basename=${basename} ` +
      `advertised=${sitemapPaths().length} captured=${captures.length} (root excluded) ` +
      `files=${filesWritten} auth_nodes_removed=${removed} ` +
      `body_bytes_min=${Math.min(...bytes)} body_bytes_max=${Math.max(...bytes)}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  });
}
