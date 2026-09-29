import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ga4PageLocation, ga4PageReferrer, routerPathOf } from "./analytics";

/**
 * Pins the two properties of the analytics script tag that fail SILENTLY if someone
 * "tidies" them away. Reads index.html from disk, the same way
 * src/config/head.guard.test.ts pins the canonical tags.
 *
 * ⚠ Neither property is cosmetic. Without `data-disable-auto-track`, the vendor script
 * sends a page view from `window.location` before any app code runs — double-counting
 * every first view and, on `/u/<token>`, transmitting a live capability token. Without
 * `beforeSend`, the `url` the vendor stamps on its own events carries that same token,
 * which redacting our `path` argument does not touch.
 */
const html = readFileSync(resolve(__dirname, "../../index.html"), "utf-8");

describe("index.html — the analytics script tag", () => {
  it("loads the first-party Vercel script, deferred", () => {
    expect(html).toContain('src="/_vercel/insights/script.js"');
    expect(html).toMatch(/<script defer src="\/_vercel\/insights\/script\.js"/);
  });

  it("★ disables the vendor's own auto-tracking", () => {
    expect(html).toContain('data-disable-auto-track="1"');
  });

  it("★ registers a beforeSend that redacts the QR capability token", () => {
    expect(html).toContain('window.va("beforeSend"');
    expect(html).toContain('"/u/:token"');
  });

  it("★ CONTROL — the redaction in this file actually redacts, and only what it should", () => {
    // Extract the live regex + replacement from the file itself rather than restating
    // it here: a copy in the test would pass forever after the real one was edited.
    const match = html.match(/event\.url = url\.replace\((\/.*?\/), "(.*?)"\)/);
    expect(match).not.toBeNull();
    const [, pattern, replacement] = match!;
    const body = pattern.slice(1, pattern.lastIndexOf("/"));
    const redact = (u: string) => u.split("?")[0].split("#")[0].replace(new RegExp(body), replacement);

    const token = "b".repeat(64);
    expect(redact(`https://www.lazytopper.com/u/${token}`)).toBe(
      "https://www.lazytopper.com/u/:token",
    );
    expect(redact(`https://www.lazytopper.com/u/${token}`)).not.toContain(token);
    expect(redact("https://www.lazytopper.com/login?oobCode=SECRET")).toBe(
      "https://www.lazytopper.com/login",
    );
    // …and leaves ordinary content alone, or it would answer nothing while looking safe.
    expect(redact("https://www.lazytopper.com/app/notes/electricity")).toBe(
      "https://www.lazytopper.com/app/notes/electricity",
    );
  });
});

/**
 * GA4-1 — the Google Analytics 4 block (owner ruling 2026-09-29).
 *
 * The block is RUN here, not just grepped: it is extracted from index.html as written and
 * executed against a stand-in window/document, so what is pinned is what it DOES — which
 * script it requests, and exactly what it hands `gtag` — on a normal page, on a `/u/`
 * hand-off link, and in an automated context.
 *
 * ★ Mutations (GA4-1 §2 G5), run against THIS file: `send_page_view: true` -> red;
 * the `/u/` skip removed -> red; `gclid` no longer kept -> red.
 */
const GA4_ID = "G-1T8Q12H4RQ";
const GTAG_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;

/** Every inline classic `<script>` block, with its offset. */
function inlineScripts(source: string): Array<{ index: number; body: string }> {
  return [...source.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map((m) => ({
    index: m.index ?? -1,
    body: m[1],
  }));
}

function ga4Blocks(): Array<{ index: number; body: string }> {
  return inlineScripts(html).filter((s) => s.body.includes(GA4_ID));
}

type Appended = { tagName: string; async?: boolean; src?: string };
type Run = {
  appended: Appended[];
  dataLayer: unknown[][] | undefined;
  gtagDefined: boolean;
  config: Record<string, unknown> | undefined;
};

function runGa4Block(href: string, opts: { referrer?: string; webdriver?: boolean } = {}): Run {
  const url = new URL(href);
  const appended: Appended[] = [];
  const win: Record<string, unknown> = {
    location: {
      href,
      origin: url.origin,
      hostname: url.hostname,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
    },
    navigator: { webdriver: opts.webdriver === true },
  };
  const doc = {
    referrer: opts.referrer ?? "",
    createElement: (tagName: string): Appended => ({ tagName }),
    head: { appendChild: (el: Appended) => appended.push(el) },
  };
  const [block] = ga4Blocks();
  new Function("window", "document", block.body)(win, doc);
  const raw = win.dataLayer as Array<ArrayLike<unknown>> | undefined;
  const dataLayer = raw?.map((entry) => Array.from(entry));
  const config = dataLayer?.find((e) => e[0] === "config")?.[2] as Record<string, unknown> | undefined;
  return { appended, dataLayer, gtagDefined: typeof win.gtag === "function", config };
}

describe("index.html — the GA4 block (GA4-1)", () => {
  it("is ONE inline block, after the preload net (P1) and before the module script (P3)", () => {
    const blocks = ga4Blocks();
    expect(blocks, "expected exactly one inline <script> carrying the GA4 id").toHaveLength(1);
    const net = inlineScripts(html).find((s) => s.body.includes('"vite:preloadError"'));
    const moduleAt = html.search(/<script\s+type="module"/i);
    expect(net).toBeDefined();
    expect(moduleAt).toBeGreaterThan(-1);
    expect(blocks[0].index).toBeGreaterThan(net!.index);
    expect(blocks[0].index).toBeLessThan(moduleAt);
    // No static tag for Google: a static <script src> could not be skipped on /u/.
    expect(html).not.toMatch(/<script[^>]*\ssrc="https:\/\/www\.googletagmanager\.com/i);
  });

  it("★ pins the config: automatic page views OFF, Google Signals OFF, ad personalisation OFF", () => {
    const [block] = ga4Blocks();
    expect(block.body).toContain("send_page_view: false");
    expect(block.body).toContain("allow_google_signals: false");
    expect(block.body).toContain("allow_ad_personalization_signals: false");
    // …and the block, when run, hands gtag exactly those values.
    const run = runGa4Block("https://www.lazytopper.com/app/");
    expect(run.config).toMatchObject({
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
  });

  it("on an ordinary page, requests gtag.js async and configures G-1T8Q12H4RQ (CONTROL for the skips below)", () => {
    const run = runGa4Block("https://www.lazytopper.com/app/notes/trigonometry");
    expect(run.appended).toEqual([{ tagName: "script", async: true, src: GTAG_SRC }]);
    expect(run.gtagDefined).toBe(true);
    expect(run.dataLayer?.map((e) => e[0])).toEqual(["js", "config"]);
    expect(run.dataLayer?.[1][1]).toBe(GA4_ID);
    // Paths that merely START with "u" are not hand-off links.
    expect(runGa4Block("https://www.lazytopper.com/app/upload").appended).toHaveLength(1);
  });

  it.each([
    ["/u/<token>", "https://www.lazytopper.com/u/"],
    ["/app/u/<token>", "https://www.lazytopper.com/app/u/"],
  ])("★★ on a hand-off link %s it does NOTHING — no script, no gtag, no dataLayer", (_label, prefix) => {
    const token = "d".repeat(64);
    const run = runGa4Block(`${prefix}${token}?gclid=G1`, { referrer: `${prefix}${token}` });
    expect(run.appended).toEqual([]);
    expect(run.gtagDefined).toBe(false);
    expect(run.dataLayer).toBeUndefined();
    expect(JSON.stringify(run)).not.toContain(token);
  });

  it("does nothing in the automated contexts analytics.ts already excludes (loopback, webdriver)", () => {
    expect(runGa4Block("http://127.0.0.1:4173/app/").appended).toEqual([]);
    expect(runGa4Block("http://localhost:5173/app/").dataLayer).toBeUndefined();
    expect(runGa4Block("https://www.lazytopper.com/app/", { webdriver: true }).gtagDefined).toBe(false);
  });

  it("★ the config address is redacted — keeps gclid and utm_*, drops every other parameter and the hash", () => {
    const run = runGa4Block(
      "https://www.lazytopper.com/app/?gclid=Cj0KCQ-abc&utm_source=google&utm_medium=cpc&oobCode=SECRET&email=a%40b.c#frag",
      { referrer: "https://www.google.com/search?q=private+words" },
    );
    expect(run.config?.page_location).toBe(
      "https://www.lazytopper.com/app/?gclid=Cj0KCQ-abc&utm_source=google&utm_medium=cpc",
    );
    expect(run.config?.page_referrer).toBe("https://www.google.com/");
    const sent = JSON.stringify(run.dataLayer);
    for (const secret of ["SECRET", "oobCode", "email", "frag", "private"]) expect(sent).not.toContain(secret);
  });

  /**
   * ★★ G2 — THE SNIPPET CANNOT IMPORT normalisePath, SO IT IS PROVEN EQUAL TO IT.
   * For every address below, what the block hands `config` must be byte-identical to what
   * analytics.ts sends on every later hit (ga4PageLocation over normalisePath). The
   * production basename is `/app` (vite.config.ts `base: "/app/"`), asserted first so the
   * comparison cannot drift from what ships.
   */
  it("★★ agrees byte-for-byte with analytics.ts's redaction (page_location AND page_referrer)", () => {
    const viteConfig = readFileSync(resolve(__dirname, "../../vite.config.ts"), "utf-8");
    expect(viteConfig).toMatch(/base:\s*"\/app\/"/);
    const base = "/app";
    const cases: Array<[string, string]> = [
      ["https://www.lazytopper.com/app/", ""],
      ["https://www.lazytopper.com/app", "https://www.google.com/"],
      ["https://www.lazytopper.com/app/notes/trigonometry/", "https://www.lazytopper.com/app/u/abc123"],
      ["https://www.lazytopper.com/app/?gclid=G1&utm_source=google&x=1#h", "https://user:pw@evil.example:8443/p?q=1"],
      ["https://www.lazytopper.com/app/login?oobCode=SECRET&continueUrl=https%3A%2F%2Fx", "android-app://com.google.android.gm/"],
      ["https://www.lazytopper.com/app/pricing?utm_campaign=board%20prep&utm_term=a+b&gclid=", "http://m.facebook.com"],
      [`https://www.lazytopper.com/app/${"x".repeat(300)}/`, "https://www.bing.com/search?q=lazytopper"],
      ["https://lazytopper-git-lane.vercel.app/app/cbse/class-10?utm_=1&gclidx=2", ""],
    ];
    for (const [href, referrer] of cases) {
      const url = new URL(href);
      const run = runGa4Block(href, { referrer });
      expect(run.config?.page_location, href).toBe(
        ga4PageLocation(routerPathOf(url.pathname, base), url.search, url.origin, base),
      );
      expect(run.config?.page_referrer, referrer).toBe(ga4PageReferrer(referrer));
    }
    // CONTROL — the comparison is not vacuous: the two sides are real, redacted strings.
    const control = runGa4Block("https://www.lazytopper.com/app/login?oobCode=SECRET&gclid=G9");
    expect(control.config?.page_location).toBe("https://www.lazytopper.com/app/login?gclid=G9");
  });
});
