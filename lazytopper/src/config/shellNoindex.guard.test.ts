// @vitest-environment node
import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import {
  PRERENDERED_DIR,
  SPA_SHELL,
  applyArtifact,
  assetRefsIn,
  desktopFragmentPathFor,
  desktopVariantFile,
  fragmentPathFor,
  noindexShell,
} from "../../scripts/seo/applyPrerendered";
import {
  applyHead,
  headForPath,
  templateDescription,
  templateTitle,
} from "../../scripts/seo/writeStaticHeads";
import { canonicalFor } from "./canonicalUrl";
import { sitemapPaths } from "./sitemapUrls";

/**
 * GUARD — ROOT-URL-1 PR-2 (SEO-4, S1): non-sitemap routes are `noindex`, sitemap pages
 * are `index`, and the difference lives IN THE FILES.
 *
 * ★ WHY IN THE FILE. Vercel applies header rules by REQUEST path, so the
 * `X-Robots-Tag: noindex` on `/__shell.html` in `vercel.json` never reached `/me`,
 * `/tutor/...` or an unknown URL that was rewritten to the shell. Production served
 * those with the template's `<meta name="robots" content="index,...">` (2026-10-04).
 *
 * ★ BOTH DIRECTIONS, END TO END. This runs the REAL post-build chain over the REAL
 * inputs — `index.html` as the template, `writeStaticHeads`' `applyHead`/`headForPath`
 * for every advertised path, then `applyArtifact` with the committed `prerendered/`
 * set — and reads the files it wrote:
 *   - `__shell.html` has exactly ONE robots meta, and it says `noindex` (and `follow`);
 *   - every sitemap URL's served file (the root's `index.html`, both shapes of every
 *     other page) has exactly ONE robots meta, and it says `index`, never `noindex`.
 */

const ROOT = resolve(__dirname, "..", "..");
const TEMPLATE = readFileSync(join(ROOT, "index.html"), "utf8");
const ANY_ROBOTS = /<meta\b[^>]*\bname\s*=\s*["']robots["'][^>]*>/gi;

function robotsMetas(html: string): string[] {
  return html.match(ANY_ROBOTS) ?? [];
}
function robotsDirectives(html: string): string[] {
  const metas = robotsMetas(html);
  const content = metas[0]?.match(/content\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
  return content.split(",").map((d) => d.trim().toLowerCase());
}

/** Reproduce what the build writes, in a temp outDir, with the committed artifact. */
function realBuild(): { out: string; cleanup: () => void } {
  const out = mkdtempSync(join(tmpdir(), "shell-noindex-"));
  writeFileSync(join(out, "index.html"), TEMPLATE, "utf8");
  for (const path of sitemapPaths()) {
    if (path === "/") continue;
    const head = headForPath(path);
    const html = applyHead(TEMPLATE, {
      path,
      url: canonicalFor(path, ""),
      title: head ? head.title : templateTitle(TEMPLATE),
      description: head ? head.description : templateDescription(TEMPLATE),
    });
    const rel = path.slice(1);
    for (const target of [`${rel}.html`, join(rel, "index.html")]) {
      mkdirSync(dirname(join(out, target)), { recursive: true });
      writeFileSync(join(out, target), html, "utf8");
    }
  }
  // The fragments' hashed figures are emitted by `vite build`; stand them in so the
  // staleness check sees a complete build. Their bytes are irrelevant here.
  for (const path of sitemapPaths()) {
    // SEO-5 PR-2: both widths' figures, since both variants are applied.
    const fragment = readFileSync(fragmentPathFor(path), "utf8") + readFileSync(desktopFragmentPathFor(path), "utf8");
    for (const ref of assetRefsIn(fragment)) {
      const file = join(out, ref.replace(/^\/(?:[^/]*\/)?assets\//, "assets/"));
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, "", "utf8");
    }
  }
  // The template here is the SOURCE index.html (no built entry chunk, no assets/), so the D4
  // preload resolution has nothing real to resolve against; it is pinned against a built-shaped
  // synthetic build in prerenderedApply.guard.test.ts and against the real build in CI's Build.
  applyArtifact(out, PRERENDERED_DIR, sitemapPaths(), { preloads: false });
  return { out, cleanup: () => rmSync(out, { recursive: true, force: true }) };
}

function servedFiles(path: string): string[] {
  // SEO-5 PR-2: the desktop variant is served AT THE PAGE'S OWN URL to desktop clients, so it
  // must say `index` exactly as the mobile file does (noindex inside it would deindex the page).
  if (path === "/") return ["index.html", desktopVariantFile("/")];
  const rel = path.slice(1);
  return [`${rel}.html`, join(rel, "index.html"), desktopVariantFile(path)];
}

describe("SEO-4 S1 — the shell is noindex, every sitemap page is index (real build chain)", () => {
  it("the template itself ships exactly one robots meta saying index (the precondition)", () => {
    expect(robotsMetas(TEMPLATE)).toHaveLength(1);
    expect(robotsDirectives(TEMPLATE)).toContain("index");
    expect(robotsDirectives(TEMPLATE)).not.toContain("noindex");
  });

  it("__shell.html has exactly ONE robots meta, and it says noindex,follow", () => {
    const { out, cleanup } = realBuild();
    try {
      const shell = readFileSync(join(out, SPA_SHELL), "utf8");
      const directives = robotsDirectives(shell);
      // eslint-disable-next-line no-console
      console.log(`SHELL_NOINDEX: shell_robots_metas=${robotsMetas(shell).length} directives=${directives.join(",")}`);
      expect(robotsMetas(shell), "the shell must carry exactly one robots meta").toHaveLength(1);
      expect(directives).toContain("noindex");
      expect(directives).toContain("follow");
      expect(directives, "the shell still says index").not.toContain("index");
      expect(shell).toContain('<meta name="robots" content="noindex,follow');
      // Only the robots meta differs from the template: the shell is otherwise the clean template.
      expect(shell.replace(ANY_ROBOTS, "")).toBe(TEMPLATE.replace(ANY_ROBOTS, ""));
    } finally {
      cleanup();
    }
  });

  it("every sitemap URL's served HTML has exactly ONE robots meta, and it says index, never noindex", () => {
    const { out, cleanup } = realBuild();
    try {
      const paths = sitemapPaths();
      let files = 0;
      for (const path of paths) {
        for (const target of servedFiles(path)) {
          const html = readFileSync(join(out, target), "utf8");
          expect(robotsMetas(html), `${target}: robots meta count`).toHaveLength(1);
          const directives = robotsDirectives(html);
          expect(directives, `${target} says noindex`).not.toContain("noindex");
          expect(directives, `${target} does not say index`).toContain("index");
          // It is a filled page, not the shell.
          expect(html, `${target} was not filled`).not.toContain('<div id="root"></div>');
          files += 1;
        }
      }
      // eslint-disable-next-line no-console
      console.log(`SITEMAP_INDEX: paths=${paths.length} files=${files}`);
      expect(paths).toContain("/");
      // Root: its file + its desktop variant. Every other page: two mobile shapes + one desktop.
      expect(files).toBe(2 + (paths.length - 1) * 3);
    } finally {
      cleanup();
    }
  });
});

describe("noindexShell — the rewrite is exact or it throws", () => {
  const HEAD = (meta: string) => `<html><head>${meta}<title>t</title></head><body><div id="root"></div></body></html>`;

  it("flips only the index directive and keeps every other directive", () => {
    const out = noindexShell(HEAD('<meta name="robots" content="index,follow,max-image-preview:large" />'));
    expect(out).toBe(HEAD('<meta name="robots" content="noindex,follow,max-image-preview:large" />'));
  });

  it("THROWS when there is no robots meta (a shell that cannot be flipped)", () => {
    expect(() => noindexShell(HEAD(""))).toThrow(/exactly ONE/);
  });

  it("THROWS on two robots metas, including a reordered one", () => {
    expect(() =>
      noindexShell(
        HEAD('<meta name="robots" content="index,follow" /><meta content="index" name="robots" />'),
      ),
    ).toThrow(/found 2/);
  });

  it("THROWS when the meta carries no index directive", () => {
    expect(() => noindexShell(HEAD('<meta name="robots" content="follow" />'))).toThrow(/exactly one/);
  });
});
