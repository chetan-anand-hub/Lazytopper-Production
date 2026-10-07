// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";

import {
  PRERENDERED_DIR,
  applyArtifact,
  desktopFragmentPathFor,
  dynamicImportCssOf,
  fragmentPathFor,
  hopUrlsIn,
  inlinableCss,
  inlinedStylesIn,
  modulepreloadHrefsIn,
  bootScriptIn,
  routeCssFor,
  INLINE_ROUTE_CSS_MODULES,
  verifyBuiltPages,
  withRouteStyles,
} from "../../scripts/seo/applyPrerendered";

/**
 * GUARD: LOW-END-3 PR-1, items (a) and (d), on the post-build apply step.
 *
 * (a) NO REDIRECT HOPS. Every absolute URL a built page emits is the final
 *     `https://www.lazytopper.com/...`; nothing points under the retired base. The same rule
 *     runs over the committed sources the build copies verbatim (sitemap, llms.txt, robots.txt,
 *     index.html, every prerendered fragment), and over every built page in `verifyBuiltPages`.
 * (d) /check-your-answer RESERVES ITS LAYOUT. A lazy route's own CSS (read from Vite's
 *     `__vite__mapDeps` table) is inlined into the page's head, so the prerendered body paints
 *     with the styles the route will have. The shift in #963 §4.5 came from that CSS arriving
 *     with the chunk. The entry stylesheet link and the head modulepreloads are left unchanged.
 *
 * Each rule is shown RED on a broken synthetic case.
 */

/** The retired base, assembled so noAppPrefix.guard (which bans the literal) stays clean. */
const OLD = "/" + "app";

const LAZYTOPPER_ROOT = resolve(__dirname, "../..");

const ROUTE_CSS = ".lt-cya__hero{padding:28px 0 26px}";
const ENTRY_LINK =
  '<link rel="stylesheet" crossorigin href="/assets/index-SSSSSSSS.css">';
const SHELL =
  '<!doctype html><html><head><title>t</title><meta name="robots" content="index,follow" />' +
  '<link rel="canonical" href="https://www.lazytopper.com/" />' +
  '<script type="module" crossorigin src="/assets/index-AAAAAAAA.js"></script>' +
  ENTRY_LINK +
  '</head><body><div id="root"></div></body></html>';
const PATHS = ["/", "/check-your-answer", "/notes/electricity"];
const ASSETS: Record<string, string> = {
  // The entry imports the CYA route through Vite's dependency table (JS + its own CSS + the shared
  // KaTeX CSS, of which only its own CSS is inlined), and the
  // Notes route with two CSS deps: the shared KaTeX CSS and the route's own CSS (neither is inlined).
  "index-AAAAAAAA.js":
    'const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/CheckYourAnswerPage-CCCCCCCC.js","assets/CheckYourAnswerPage-RRRRRRRR.css","assets/DesktopNotesPage-FFFFFFFF.js","assets/katex-KKKKKKKK.css","assets/DesktopNotesPage-NNNNNNNN.css"])))=>i.map(i=>d[i]);' +
    'const a=()=>__vitePreload(()=>import("./CheckYourAnswerPage-CCCCCCCC.js"),__vite__mapDeps([0,1,3]));' +
    'const b=()=>__vitePreload(()=>import("./DesktopNotesPage-FFFFFFFF.js"),__vite__mapDeps([2,3,4]));',
  "CheckYourAnswerPage-CCCCCCCC.js": "export default 1;",
  "DesktopNotesPage-FFFFFFFF.js": "export default 2;",
  "index-SSSSSSSS.css": ".lt-a{color:red}",
  "CheckYourAnswerPage-RRRRRRRR.css": ROUTE_CSS,
  // A SHARED lazy CSS (Notes/HPQ import KaTeX): it must never be inlined (D63a).
  "katex-KKKKKKKK.css": ".katex{font:normal 1.21em KaTeX_Main}",
  // The Notes route's OWN CSS: also never inlined, because only CheckYourAnswerPage is allowlisted.
  "DesktopNotesPage-NNNNNNNN.css": ".lt-notes-own{margin:0}",
};

function build(): { out: string; art: string; cleanup: () => void } {
  const out = mkdtempSync(join(tmpdir(), "le3-out-"));
  const art = mkdtempSync(join(tmpdir(), "le3-art-"));
  writeFileSync(join(out, "index.html"), SHELL, "utf8");
  mkdirSync(join(out, "assets"), { recursive: true });
  for (const [file, code] of Object.entries(ASSETS))
    writeFileSync(join(out, "assets", file), code, "utf8");
  for (const path of PATHS) {
    if (path !== "/") {
      const rel = path.slice(1);
      mkdirSync(join(out, rel), { recursive: true });
      const stamped = SHELL.replace(
        "https://www.lazytopper.com/",
        `https://www.lazytopper.com${path}`,
      );
      writeFileSync(join(out, `${rel}.html`), stamped, "utf8");
      writeFileSync(join(out, rel, "index.html"), stamped, "utf8");
    }
    for (const file of [
      fragmentPathFor(path, art),
      desktopFragmentPathFor(path, art),
    ]) {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(
        file,
        `<main><h1>${path}</h1><a href="/pricing">p</a></main>`,
        "utf8",
      );
    }
  }
  writeFileSync(
    join(art, "manifest.json"),
    JSON.stringify({ paths: PATHS }),
    "utf8",
  );
  return {
    out,
    art,
    cleanup: () =>
      [out, art].forEach((d) => rmSync(d, { recursive: true, force: true })),
  };
}

const read = (out: string, file: string): string =>
  readFileSync(join(out, file), "utf8");

describe("LOW-END-3 (d): a route's own CSS is inlined into its prerendered page", () => {
  it("inlines the CYA route CSS in the head of every variant; the entry link stays, the route preload is deferred (PR-2)", () => {
    const { out, art, cleanup } = build();
    try {
      applyArtifact(out, art, PATHS);
      for (const file of [
        "check-your-answer.html",
        "check-your-answer/index.html",
        "__desktop/check-your-answer.html",
      ]) {
        const html = read(out, file);
        expect(inlinedStylesIn(html), file).toEqual([
          "CheckYourAnswerPage-RRRRRRRR.css",
        ]);
        expect(html, file).toContain(
          `<style data-lt-inline="CheckYourAnswerPage-RRRRRRRR.css">${ROUTE_CSS}</style>`,
        );
        // In the head, after the entry stylesheet (Vite's own order), before the body paints.
        expect(html.indexOf(ROUTE_CSS), file).toBeGreaterThan(
          html.indexOf(ENTRY_LINK),
        );
        expect(html.indexOf(ROUTE_CSS), file).toBeLessThan(
          html.indexOf("</head>"),
        );
        // Unchanged: the entry stylesheet link. LOW-END-3 PR-2 (D74): /check-your-answer is
        // hydrated at every width, so its route preload moved from the head into the deferred
        // boot script, which starts it after first contentful paint.
        expect(html, file).toContain(ENTRY_LINK);
        expect(modulepreloadHrefsIn(html), file).toEqual([]);
        expect(bootScriptIn(html)?.preloads, file).toEqual(["/assets/CheckYourAnswerPage-CCCCCCCC.js"]);
      }
      // ★ CONTROL (D63a): the Notes route DOES import a lazy CSS (KaTeX), and it is NOT inlined:
      // only the allowlisted CheckYourAnswerPage route's own CSS is. The Notes page is
      // byte-identical to what it would be without this step's CSS work.
      expect(
        routeCssFor(
          "/notes/electricity",
          join(out, "assets"),
          SHELL,
          Object.keys(ASSETS),
        ),
      ).toEqual([]);
      for (const file of [
        "notes/electricity.html",
        "notes/electricity/index.html",
        "__desktop/notes/electricity.html",
      ]) {
        expect(inlinedStylesIn(read(out, file)), file).toEqual([]);
        expect(read(out, file), file).not.toContain("KaTeX_Main");
        expect(read(out, file), file).not.toContain(".lt-notes-own");
      }
      expect(INLINE_ROUTE_CSS_MODULES).toEqual(["CheckYourAnswerPage"]);
      expect(inlinedStylesIn(read(out, "index.html"))).toEqual([]);
      expect(inlinedStylesIn(read(out, "__shell.html"))).toEqual([]);
      expect(verifyBuiltPages(out, PATHS).failures).toEqual([]);
    } finally {
      cleanup();
    }
  });

  it("dynamicImportCssOf reads Vite's own dependency table, and only CSS from it", () => {
    const entry = ASSETS["index-AAAAAAAA.js"];
    expect(
      dynamicImportCssOf(entry, "CheckYourAnswerPage-CCCCCCCC.js"),
    ).toEqual(["CheckYourAnswerPage-RRRRRRRR.css", "katex-KKKKKKKK.css"]);
    expect(dynamicImportCssOf(entry, "DesktopNotesPage-FFFFFFFF.js")).toEqual([
      "katex-KKKKKKKK.css",
      "DesktopNotesPage-NNNNNNNN.css",
    ]);
    expect(dynamicImportCssOf(entry, "Missing-ZZZZZZZZ.js")).toEqual([]);
    // A table that is referenced but unreadable fails the build; it does not inline nothing.
    expect(() =>
      dynamicImportCssOf(
        'import("./X-12345678.js"),__vite__mapDeps([0])',
        "X-12345678.js",
      ),
    ).toThrow(/dependency table/);
  });

  it("refuses a stylesheet that cannot be inlined as-is", () => {
    expect(inlinableCss("a.css", ROUTE_CSS)).toBe(ROUTE_CSS);
    expect(
      inlinableCss("a.css", ".a{background:url(/fonts/f.woff2)}"),
    ).toContain("/fonts/");
    expect(() =>
      inlinableCss("a.css", ".a{background:url(img/x.png)}"),
    ).toThrow(/relative url/);
    expect(() => inlinableCss("a.css", ".a{content:'</style>'}")).toThrow(
      /<\/style/,
    );
  });

  it("withRouteStyles keeps an exactly-once </head> check", () => {
    expect(() =>
      withRouteStyles("<head></head></head>", [{ file: "a.css", css: "" }]),
    ).toThrow(/exactly one <\/head>/);
    expect(withRouteStyles("<head></head>", [])).toBe("<head></head>");
  });
});

describe("LOW-END-3 (a): no URL the site emits costs a redirect hop", () => {
  it("hopUrlsIn flags the apex, http, protocol-relative and the retired base; passes the final URL", () => {
    expect(
      hopUrlsIn(
        '<link rel="canonical" href="https://www.lazytopper.com/notes/x" />',
      ),
    ).toEqual([]);
    expect(
      hopUrlsIn(
        '<a href="mailto:support@lazytopper.com">m</a><a href="/notes/x">n</a>',
      ),
    ).toEqual([]);
    expect(hopUrlsIn('{"url":"https://www.lazytopper.com/"}')).toEqual([]);
    expect(
      hopUrlsIn('<link rel="canonical" href="https://lazytopper.com/x" />'),
    ).toEqual(["https://lazytopper.com/x"]);
    expect(hopUrlsIn('<meta content="http://www.lazytopper.com/" />')).toEqual([
      "http://www.lazytopper.com/",
    ]);
    expect(hopUrlsIn('<a href="//lazytopper.com/">x</a>')).toEqual([
      "//lazytopper.com/",
    ]);
    expect(
      hopUrlsIn(`<a href="https://www.lazytopper.com${OLD}/notes/x">x</a>`),
    ).toEqual([`https://www.lazytopper.com${OLD}/notes/x`]);
    expect(
      hopUrlsIn(`<a href="${OLD}/notes/x">x</a><a href="${OLD}">y</a>`),
    ).toEqual([`${OLD}/notes/x`, OLD]);
    // ★ CONTROL: a path that merely starts with the same letters is not the retired base.
    expect(
      hopUrlsIn('<a href="/application">x</a><a href="/apps/x">y</a>'),
    ).toEqual([]);
  });

  it("RED: verifyBuiltPages names a built page that emits a hop URL", () => {
    const { out, art, cleanup } = build();
    try {
      applyArtifact(out, art, PATHS);
      const file = join(out, "notes", "electricity.html");
      writeFileSync(
        file,
        readFileSync(file, "utf8").replace(
          'href="/pricing"',
          `href="${OLD}/pricing"`,
        ),
        "utf8",
      );
      expect(verifyBuiltPages(out, PATHS).failures).toEqual([
        `/notes/electricity: the mobile file notes/electricity.html emits ${OLD}/pricing, which redirects (not the final www URL)`,
      ]);
    } finally {
      cleanup();
    }
  });

  it("★ the committed sources the build ships verbatim emit no hop URL (sitemap, llms, robots, every fragment)", () => {
    const files = [
      join(LAZYTOPPER_ROOT, "public", "sitemap.xml"),
      join(LAZYTOPPER_ROOT, "public", "llms.txt"),
      join(LAZYTOPPER_ROOT, "public", "robots.txt"),
      join(LAZYTOPPER_ROOT, "index.html"),
    ];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const absolute = join(dir, entry.name);
        if (entry.isDirectory()) walk(absolute);
        else if (entry.name.endsWith(".html")) files.push(absolute);
      }
    };
    walk(PRERENDERED_DIR);
    const hops: string[] = [];
    for (const file of files) {
      expect(existsSync(file), file).toBe(true);
      for (const url of hopUrlsIn(readFileSync(file, "utf8")))
        hops.push(`${file}: ${url}`);
    }
    // 4 sources + 2 x 63 fragments at the time of writing; a shrinking set would be a vacuous pass.
    expect(files.length).toBeGreaterThan(100);
    expect(hops).toEqual([]);
  });
});
