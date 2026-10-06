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
  entryStylesheetOf,
  fragmentPathFor,
  hopUrlsIn,
  inlinableCss,
  inlinedStylesIn,
  modulepreloadHrefsIn,
  stylesheetLinksIn,
  verifyBuiltPages,
  withPreloads,
} from "../../scripts/seo/applyPrerendered";

/**
 * GUARD: LOW-END-3 PR-1, items (a), (c) and (d), on the post-build apply step.
 *
 * (a) NO REDIRECT HOPS. Every absolute URL a built page emits is the final
 *     `https://www.lazytopper.com/...`; nothing points under the retired `/app` base. The same
 *     rule runs over the committed sources the build copies verbatim (sitemap, llms.txt,
 *     robots.txt, every prerendered fragment), and over every built page in `verifyBuiltPages`.
 * (c) FIRST PAINT NEVER WAITS FOR BIG JS. The one render-blocking stylesheet is inlined, and the
 *     route `modulepreload`s move from the head to the end of the body.
 * (d) /check-your-answer RESERVES ITS LAYOUT. A lazy route's own CSS (read from Vite's
 *     `__vite__mapDeps` table) is inlined too, so the prerendered body paints with the styles the
 *     route will have: the shift measured in #963 §4.5 came from that CSS arriving with the chunk.
 *
 * Each rule is shown RED on a broken synthetic case (a guard that cannot fail is not a guard).
 */

/** The retired base, assembled so noAppPrefix.guard (which bans the literal) stays clean. */
const OLD = "/" + "app";

const LAZYTOPPER_ROOT = resolve(__dirname, "../..");

const ENTRY_CSS =
  ".lt-a{color:red}@font-face{font-family:F;src:url(/fonts/f.woff2)}";
const ROUTE_CSS = ".lt-cya__hero{padding:28px 0 26px}";
const SHELL =
  '<!doctype html><html><head><title>t</title><meta name="robots" content="index,follow" />' +
  '<link rel="canonical" href="https://www.lazytopper.com/" />' +
  '<script type="module" crossorigin src="/assets/index-AAAAAAAA.js"></script>' +
  '<link rel="stylesheet" crossorigin href="/assets/index-SSSSSSSS.css">' +
  '</head><body><div id="root"></div></body></html>';
const PATHS = ["/", "/check-your-answer", "/notes/electricity"];
const ASSETS: Record<string, string> = {
  // The entry imports the CYA route through Vite's dependency table (JS + its CSS), and the
  // Notes route with no table entry (no CSS).
  "index-AAAAAAAA.js":
    'const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/CheckYourAnswerPage-CCCCCCCC.js","assets/CheckYourAnswerPage-RRRRRRRR.css"])))=>i.map(i=>d[i]);' +
    'const a=()=>__vitePreload(()=>import("./CheckYourAnswerPage-CCCCCCCC.js"),__vite__mapDeps([0,1]));' +
    'const b=()=>import("./DesktopNotesPage-FFFFFFFF.js");',
  "CheckYourAnswerPage-CCCCCCCC.js": "export default 1;",
  "DesktopNotesPage-FFFFFFFF.js": "export default 2;",
  "index-SSSSSSSS.css": ENTRY_CSS,
  "CheckYourAnswerPage-RRRRRRRR.css": ROUTE_CSS,
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

describe("LOW-END-3 (c)+(d): the stylesheet is inlined, route CSS with it, preloads after the body", () => {
  it("inlines the entry CSS (and the route's CSS) in place of the render-blocking link, on every variant", () => {
    const { out, art, cleanup } = build();
    try {
      applyArtifact(out, art, PATHS);
      for (const file of [
        "check-your-answer.html",
        "check-your-answer/index.html",
        "__desktop/check-your-answer.html",
      ]) {
        const html = read(out, file);
        expect(stylesheetLinksIn(html), file).toEqual([]);
        expect(inlinedStylesIn(html), file).toEqual([
          "index-SSSSSSSS.css",
          "CheckYourAnswerPage-RRRRRRRR.css",
        ]);
        expect(html, file).toContain(
          `<style data-lt-inline="CheckYourAnswerPage-RRRRRRRR.css">${ROUTE_CSS}</style>`,
        );
        // The styles sit in the head, before the body paints.
        expect(html.indexOf(ROUTE_CSS), file).toBeLessThan(
          html.indexOf("</head>"),
        );
      }
      // A route with no CSS of its own gets the entry CSS only; so does the root.
      expect(inlinedStylesIn(read(out, "notes/electricity.html"))).toEqual([
        "index-SSSSSSSS.css",
      ]);
      expect(inlinedStylesIn(read(out, "index.html"))).toEqual([
        "index-SSSSSSSS.css",
      ]);
      // ★ CONTROL: the SPA shell has no prerendered body, so it keeps the cacheable link.
      expect(stylesheetLinksIn(read(out, "__shell.html"))).toHaveLength(1);
      expect(inlinedStylesIn(read(out, "__shell.html"))).toEqual([]);
    } finally {
      cleanup();
    }
  });

  it("moves the route modulepreloads to the end of the body: none left in the head", () => {
    const { out, art, cleanup } = build();
    try {
      applyArtifact(out, art, PATHS);
      const html = read(out, "check-your-answer.html");
      const head = html.slice(0, html.indexOf("</head>"));
      expect(modulepreloadHrefsIn(head)).toEqual([]);
      expect(modulepreloadHrefsIn(html)).toEqual([
        "/assets/CheckYourAnswerPage-CCCCCCCC.js",
      ]);
      expect(html.indexOf('rel="modulepreload"')).toBeGreaterThan(
        html.indexOf("</main>"),
      );
      expect(html.indexOf('rel="modulepreload"')).toBeLessThan(
        html.indexOf("</body>"),
      );
      expect(verifyBuiltPages(out, PATHS).failures).toEqual([]);
    } finally {
      cleanup();
    }
  });

  it("RED: verifyBuiltPages names a page that still links the stylesheet, or preloads in its head", () => {
    const { out, art, cleanup } = build();
    try {
      applyArtifact(out, art, PATHS);
      const file = join(out, "__desktop", "check-your-answer.html");
      const html = readFileSync(file, "utf8")
        .replace(
          /<style data-lt-inline="index-SSSSSSSS\.css">[^<]*<\/style>/,
          '<link rel="stylesheet" crossorigin href="/assets/index-SSSSSSSS.css">',
        )
        .replace(/(<link rel="modulepreload"[^>]*>)<\/body>/, "</body>")
        .replace(
          "</head>",
          '<link rel="modulepreload" crossorigin href="/assets/CheckYourAnswerPage-CCCCCCCC.js"></head>',
        );
      writeFileSync(file, html, "utf8");
      const failures = verifyBuiltPages(out, PATHS).failures.join("\n");
      expect(failures).toContain(
        "__desktop/check-your-answer.html still carries a render-blocking",
      );
      expect(failures).toContain(
        "__desktop/check-your-answer.html does not inline the entry CSS index-SSSSSSSS.css",
      );
      expect(failures).toContain(
        "__desktop/check-your-answer.html carries modulepreload links in its HEAD",
      );
    } finally {
      cleanup();
    }
  });

  it("dynamicImportCssOf reads Vite's own dependency table, and only CSS from it", () => {
    const entry = ASSETS["index-AAAAAAAA.js"];
    expect(
      dynamicImportCssOf(entry, "CheckYourAnswerPage-CCCCCCCC.js"),
    ).toEqual(["CheckYourAnswerPage-RRRRRRRR.css"]);
    expect(dynamicImportCssOf(entry, "DesktopNotesPage-FFFFFFFF.js")).toEqual(
      [],
    );
    // A table that is referenced but unreadable fails the build, it does not inline nothing.
    expect(() =>
      dynamicImportCssOf(
        'import("./X-12345678.js"),__vite__mapDeps([0])',
        "X-12345678.js",
      ),
    ).toThrow(/dependency table/);
  });

  it("refuses a stylesheet that cannot be inlined as-is", () => {
    expect(inlinableCss("a.css", ENTRY_CSS)).toBe(ENTRY_CSS);
    expect(
      inlinableCss("a.css", ".a{background:url(data:image/png;base64,AA)}"),
    ).toContain("data:");
    expect(() =>
      inlinableCss("a.css", ".a{background:url(img/x.png)}"),
    ).toThrow(/relative url/);
    expect(() => inlinableCss("a.css", ".a{content:'</style>'}")).toThrow(
      /<\/style/,
    );
  });

  it("entryStylesheetOf: exactly one entry stylesheet, or none", () => {
    expect(entryStylesheetOf(SHELL)?.file).toBe("index-SSSSSSSS.css");
    expect(
      entryStylesheetOf(SHELL.replace(/<link rel="stylesheet"[^>]*>/, "")),
    ).toBeNull();
    expect(() =>
      entryStylesheetOf(
        SHELL.replace(
          "</head>",
          '<link rel="stylesheet" href="/assets/other-TTTTTTTT.css"></head>',
        ),
      ),
    ).toThrow(/exactly ONE/);
  });

  it("withPreloads keeps the exactly-once </head> check and adds one for </body>", () => {
    expect(() =>
      withPreloads("<head></head><body></body></head>", ["/assets/a.js"]),
    ).toThrow(/exactly one <\/head>/);
    expect(() =>
      withPreloads("<head></head><body></body></body>", ["/assets/a.js"]),
    ).toThrow(/exactly one <\/body>/);
  });
});

describe("LOW-END-3 (a): no URL the site emits costs a redirect hop", () => {
  it("hopUrlsIn flags the apex, http, protocol-relative and the retired /app base; passes the final URL", () => {
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
    let checked = 0;
    for (const file of files) {
      expect(existsSync(file), file).toBe(true);
      checked += 1;
      for (const url of hopUrlsIn(readFileSync(file, "utf8")))
        hops.push(`${file}: ${url}`);
    }
    // 4 sources + 2 x 63 fragments at the time of writing; a shrinking set would be a vacuous pass.
    expect(checked).toBeGreaterThan(100);
    expect(hops).toEqual([]);
  });
});
