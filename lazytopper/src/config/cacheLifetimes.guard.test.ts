// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * CACHE-LIFETIMES-1 (7 Nov 2026). PageSpeed "Use efficient cache lifetimes" flagged the unhashed public files (the Fraunces font,
 * /brand logos, /media testimonial posters, icons) served with Vercel's default `max-age=0, must-revalidate`. This pins the policy:
 *  - content-hashed /assets/* and the never-modified /fonts/* : 1 year, immutable;
 *  - brand / media / visuals / figures / root icons (rarely replaced in place): 30 days + stale-while-revalidate;
 *  - pack previews and sample PDFs (regenerated with content): 1 day + stale-while-revalidate;
 *  - HTML, the shell, sitemap, robots, llms.txt, version.json, a service worker / manifest: NO Cache-Control rule (default max-age=0).
 */
type Rule = { source: string; headers: { key: string; value: string }[] };
const vercel = JSON.parse(readFileSync(resolve(__dirname, "../../../vercel.json"), "utf8")) as { headers: Rule[] };

/** Enough of Vercel's path-to-regexp for the sources in vercel.json: `:name*`, `:name(re)`, `(a|b)` groups. */
function toRegExp(source: string): RegExp {
  let re = "";
  for (let i = 0; i < source.length; ) {
    const named = /^:(\w+)(\((?:[^()\\]|\\.|\([^()]*\))*\))?(\*)?/.exec(source.slice(i));
    if (named) {
      if (named[2]) re += named[2];
      else if (named[3]) re += "(?:[^/]+(?:/[^/]+)*)?";
      else re += "[^/]+";
      i += named[0].length;
      continue;
    }
    const ch = source[i];
    re += ch === "." ? "\\." : ch;
    i += 1;
  }
  return new RegExp(`^${re}$`);
}

function cacheControl(path: string): string | null {
  let value: string | null = null;
  for (const rule of vercel.headers) {
    const h = rule.headers.find((x) => x.key.toLowerCase() === "cache-control");
    if (h && toRegExp(rule.source).test(path)) value = h.value;
  }
  return value;
}

describe("CACHE-LIFETIMES-1 vercel.json Cache-Control", () => {
  it("hashed assets and fonts: one year, immutable", () => {
    for (const p of ["/assets/index-B1x2Y3z4.js", "/assets/PackDialog-Dj4EhYHu.css", "/fonts/fraunces-700-latin.woff2", "/fonts/kalam/kalam-latin-400-normal.woff2"]) {
      expect(cacheControl(p), p).toBe("public, max-age=31536000, immutable");
    }
  });

  it("logos, posters, figures and icons: 30 days with stale-while-revalidate (not immutable - they have no hash)", () => {
    for (const p of [
      "/brand/lazytopper-fingerprint-mark.webp",
      "/media/swajeet-testimonial-960x540.webp",
      "/visuals/a.svg",
      "/figures/x.png",
      "/favicon.ico",
      "/favicon-32x32.png",
      "/apple-touch-icon.png",
      "/logo-square.png",
      "/og-image.png",
    ]) {
      expect(cacheControl(p), p).toBe("public, max-age=2592000, stale-while-revalidate=604800");
    }
  });

  it("pack previews and sample PDFs (regenerated with content): one day with stale-while-revalidate", () => {
    for (const p of ["/packs/previews/subject-maths-cover-480.webp", "/samples/lazytopper-sample-bundle.pdf"]) {
      expect(cacheControl(p), p).toBe("public, max-age=86400, stale-while-revalidate=604800");
    }
  });

  it("never gives HTML, the shell, sitemap, robots, llms.txt, version.json, a service worker or a manifest a Cache-Control rule", () => {
    for (const p of [
      "/",
      "/packs",
      "/packs/",
      "/pricing",
      "/notes/triangles",
      "/__shell.html",
      "/index.html",
      "/404.html",
      "/sitemap.xml",
      "/robots.txt",
      "/llms.txt",
      "/version.json",
      "/sw.js",
      "/manifest.webmanifest",
      "/manifest.json",
      "/prerendered/packs.html",
      "/a6c1861da61f4d36898e5e27a71c36d6.txt",
    ]) {
      expect(cacheControl(p), p).toBeNull();
    }
  });
});
