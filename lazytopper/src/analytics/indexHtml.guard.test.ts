import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ga4PageLocation, ga4PageReferrer, normalisePath, routerPathOf } from "./analytics";

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

/**
 * ROOT-URL-1 — the app is served at the domain root. The retired base (still carried by
 * old hand-off links until the edge redirects them) is read from vercel.json's redirect to
 * the root rather than restated, so this file holds no literal of it.
 */
const RETIRED_BASE: string = (
  JSON.parse(readFileSync(resolve(__dirname, "../../../vercel.json"), "utf-8")) as {
    redirects: Array<{ source: string; destination: string }>;
  }
).redirects.find((r) => r.destination === "/")!.source;

type BeforeSend = (event: unknown) => unknown;

/** Run the Vercel block from index.html as written and hand back the `beforeSend` it registers. */
function loadBeforeSend(): BeforeSend {
  const block = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1])
    .find((b) => b.includes('window.va("beforeSend"'));
  if (!block) throw new Error("index.html has no inline block registering beforeSend");
  let captured: BeforeSend | null = null;
  const win: Record<string, unknown> = {
    va: (kind: string, fn: BeforeSend) => {
      if (kind === "beforeSend") captured = fn;
    },
  };
  new Function("window", block)(win);
  if (!captured) throw new Error("the Vercel block ran but registered no beforeSend");
  return captured;
}

const runBeforeSend = (event: unknown): unknown => loadBeforeSend()(event);
const beforeSendUrl = (url: string): string => (runBeforeSend({ url }) as { url: string }).url;

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

  it("★ CONTROL — the beforeSend in this file actually redacts, and only what it should", () => {
    // RUN the block from the file rather than restating its rule here: a copy in the test
    // would pass forever after the real one was edited.
    const token = "b".repeat(64);
    expect(beforeSendUrl(`https://www.lazytopper.com/u/${token}`)).toBe("https://www.lazytopper.com/u/:token");
    expect(beforeSendUrl(`https://www.lazytopper.com/u/${token}`)).not.toContain(token);
    expect(beforeSendUrl("https://www.lazytopper.com/login?oobCode=SECRET")).toBe(
      "https://www.lazytopper.com/login",
    );
    // ROOT-URL-1 M4 — the personal-data rules normalisePath applies (FU-INDEXHTML-PATH-PII-VERCEL-BEFORESEND).
    expect(beforeSendUrl("https://www.lazytopper.com/admin/students/AbCdEfGhIjKlMnOpQrStUvWxYz12")).toBe(
      "https://www.lazytopper.com/admin/students/:id",
    );
    expect(beforeSendUrl("https://www.lazytopper.com/parent/a%40b.c/report")).toBe(
      "https://www.lazytopper.com/parent/:email/report",
    );
    // …and leaves ordinary content alone, or it would answer nothing while looking safe.
    expect(beforeSendUrl("https://www.lazytopper.com/notes/electricity")).toBe(
      "https://www.lazytopper.com/notes/electricity",
    );
    expect(beforeSendUrl("https://www.lazytopper.com/notes/chemical-reactions-and-equations")).toBe(
      "https://www.lazytopper.com/notes/chemical-reactions-and-equations",
    );
    // A non-string url or a missing event passes through untouched.
    expect(runBeforeSend({ url: 42 })).toEqual({ url: 42 });
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
 *
 * Owner ruling 2 (2026-09-29, BRIEF_GA4-1_ADDENDUM_OWNER_RULING_2.md) superseded spec G1's
 * two flags: Google Signals and ad personalisation are ON, and are pinned ON below — a
 * silent flip either way is a change to what the Privacy Policy tells students.
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
  /** LOW-END-1 (L2) — drive the deferred library load. */
  fire: (event: string) => void;
  runIdle: () => void;
  runTimers: () => void;
  timers: number[];
  idleTimeouts: Array<number | undefined>;
  listeners: () => string[];
  win: Record<string, unknown>;
};

function runGa4Block(
  href: string,
  opts: { referrer?: string; webdriver?: boolean; readyState?: string; noIdle?: boolean } = {},
): Run {
  const url = new URL(href);
  const appended: Appended[] = [];
  const listeners = new Map<string, Array<() => void>>();
  const timers: Array<{ ms: number; fn: () => void }> = [];
  const idles: Array<{ timeout?: number; fn: () => void }> = [];
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
    addEventListener: (type: string, fn: () => void) => {
      listeners.set(type, [...(listeners.get(type) ?? []), fn]);
    },
    removeEventListener: (type: string, fn: () => void) => {
      listeners.set(type, (listeners.get(type) ?? []).filter((f) => f !== fn));
    },
    setTimeout: (fn: () => void, ms: number) => {
      timers.push({ ms, fn });
      return timers.length;
    },
  };
  if (!opts.noIdle) {
    win.requestIdleCallback = (fn: () => void, o?: { timeout?: number }) => {
      idles.push({ timeout: o?.timeout, fn });
      return idles.length;
    };
  }
  const doc = {
    referrer: opts.referrer ?? "",
    readyState: opts.readyState ?? "interactive",
    createElement: (tagName: string): Appended => ({ tagName }),
    head: { appendChild: (el: Appended) => appended.push(el) },
  };
  const [block] = ga4Blocks();
  new Function("window", "document", block.body)(win, doc);
  const raw = win.dataLayer as Array<ArrayLike<unknown>> | undefined;
  const dataLayer = raw?.map((entry) => Array.from(entry));
  const config = dataLayer?.find((e) => e[0] === "config")?.[2] as Record<string, unknown> | undefined;
  return {
    appended,
    dataLayer,
    gtagDefined: typeof win.gtag === "function",
    config,
    fire: (event) => [...(listeners.get(event) ?? [])].forEach((fn) => fn()),
    runIdle: () => idles.splice(0).forEach((i) => i.fn()),
    runTimers: () => timers.splice(0).forEach((t) => t.fn()),
    get timers() {
      return timers.map((t) => t.ms);
    },
    get idleTimeouts() {
      return idles.map((i) => i.timeout);
    },
    listeners: () => [...listeners.entries()].filter(([, fns]) => fns.length > 0).map(([type]) => type).sort(),
    win,
  };
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

  it("★ pins the config: automatic page views OFF; Google Signals + ad personalisation ON (owner ruling 2)", () => {
    const [block] = ga4Blocks();
    expect(block.body).toContain("send_page_view: false");
    expect(block.body).toContain("allow_google_signals: true");
    expect(block.body).toContain("allow_ad_personalization_signals: true");
    // …and the block, when run, hands gtag exactly those values.
    const run = runGa4Block("https://www.lazytopper.com/");
    expect(run.config).toMatchObject({
      send_page_view: false,
      allow_google_signals: true,
      allow_ad_personalization_signals: true,
    });
  });

  it("on an ordinary page, configures G-1T8Q12H4RQ at once and requests gtag.js async once the page is idle (CONTROL for the skips below)", () => {
    const run = runGa4Block("https://www.lazytopper.com/notes/trigonometry");
    expect(run.gtagDefined).toBe(true);
    expect(run.dataLayer?.map((e) => e[0])).toEqual(["js", "config"]);
    expect(run.dataLayer?.[1][1]).toBe(GA4_ID);
    run.fire("load");
    run.runIdle();
    expect(run.appended).toEqual([{ tagName: "script", async: true, src: GTAG_SRC }]);
    // Paths that merely START with "u" are not hand-off links.
    const upload = runGa4Block("https://www.lazytopper.com/upload");
    upload.fire("pointerdown");
    expect(upload.appended).toHaveLength(1);
  });

  it.each([
    ["/u/<token>", "https://www.lazytopper.com/u/"],
    ["<retired base>/u/<token>", `https://www.lazytopper.com${RETIRED_BASE}/u/`],
  ])("★★ on a hand-off link %s it does NOTHING — no script, no gtag, no dataLayer", (_label, prefix) => {
    const token = "d".repeat(64);
    const run = runGa4Block(`${prefix}${token}?gclid=G1`, { referrer: `${prefix}${token}` });
    // …not even after load, idle, the 4 s cap or an interaction (nothing is listening).
    expect(run.listeners()).toEqual([]);
    run.fire("load");
    run.fire("pointerdown");
    run.runIdle();
    run.runTimers();
    expect(run.appended).toEqual([]);
    expect(run.gtagDefined).toBe(false);
    expect(run.dataLayer).toBeUndefined();
    expect(JSON.stringify({ appended: run.appended, dataLayer: run.dataLayer, config: run.config })).not.toContain(token);
  });

  it("does nothing in the automated contexts analytics.ts already excludes (loopback, webdriver)", () => {
    const loopback = runGa4Block("http://127.0.0.1:4173/");
    loopback.fire("load");
    loopback.runIdle();
    loopback.runTimers();
    expect(loopback.appended).toEqual([]);
    expect(runGa4Block("http://localhost:5173/").dataLayer).toBeUndefined();
    expect(runGa4Block("https://www.lazytopper.com/", { webdriver: true }).gtagDefined).toBe(false);
  });

  it("★ the config address is redacted — keeps gclid and utm_*, drops every other parameter and the hash", () => {
    const run = runGa4Block(
      "https://www.lazytopper.com/?gclid=Cj0KCQ-abc&utm_source=google&utm_medium=cpc&oobCode=SECRET&email=a%40b.c#frag",
      { referrer: "https://www.google.com/search?q=private+words" },
    );
    expect(run.config?.page_location).toBe(
      "https://www.lazytopper.com/?gclid=Cj0KCQ-abc&utm_source=google&utm_medium=cpc",
    );
    expect(run.config?.page_referrer).toBe("https://www.google.com/");
    const sent = JSON.stringify(run.dataLayer);
    for (const secret of ["SECRET", "oobCode", "email", "frag", "private"]) expect(sent).not.toContain(secret);
  });

  /**
   * ★★ G2 — THE SNIPPET CANNOT IMPORT normalisePath, SO IT IS PROVEN EQUAL TO IT.
   * For every address below, what the block hands `config` must be byte-identical to what
   * analytics.ts sends on every later hit (ga4PageLocation over normalisePath). The
   * production basename is EMPTY since ROOT-URL-1 (vite.config.ts `base: "/"`), asserted
   * first so the comparison cannot drift from what ships.
   */
  it("★★ agrees byte-for-byte with analytics.ts's redaction (page_location AND page_referrer)", () => {
    const viteConfig = readFileSync(resolve(__dirname, "../../vite.config.ts"), "utf-8");
    expect(viteConfig).toMatch(/^\s*base:\s*"\/"/m);
    const base = "";
    const [block] = ga4Blocks();
    expect(block.body).toContain('var BASE = "";');
    const cases: Array<[string, string]> = [
      ["https://www.lazytopper.com/", ""],
      ["https://www.lazytopper.com", "https://www.google.com/"],
      ["https://www.lazytopper.com/notes/trigonometry/", "https://www.lazytopper.com/u/abc123"],
      ["https://www.lazytopper.com/?gclid=G1&utm_source=google&x=1#h", "https://user:pw@evil.example:8443/p?q=1"],
      ["https://www.lazytopper.com/login?oobCode=SECRET&continueUrl=https%3A%2F%2Fx", "android-app://com.google.android.gm/"],
      ["https://www.lazytopper.com/pricing?utm_campaign=board%20prep&utm_term=a+b&gclid=", "http://m.facebook.com"],
      [`https://www.lazytopper.com/${"x".repeat(300)}/`, "https://www.bing.com/search?q=lazytopper"],
      ["https://lazytopper-git-lane.vercel.app/cbse/class-10?utm_=1&gclidx=2", ""],
      // ROOT-URL-1 M4 — the personal-data segments normalisePath redacts.
      ["https://www.lazytopper.com/admin/students/AbCdEfGhIjKlMnOpQrStUvWxYz12", ""],
      ["https://www.lazytopper.com/parent/a%40b.c/report?gclid=G3", ""],
      ["https://www.lazytopper.com/notes/chemical-reactions-and-equations", ""],
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
    const control = runGa4Block("https://www.lazytopper.com/admin/students/AbCdEfGhIjKlMnOpQrStUvWxYz12?oobCode=SECRET&gclid=G9");
    expect(control.config?.page_location).toBe("https://www.lazytopper.com/admin/students/:id?gclid=G9");
  });

  /**
   * ★★ ROOT-URL-1 M4 — PARITY BETWEEN BOTH SENDERS AND normalisePath, ON THE SAME CASES.
   * Closes FU-INDEXHTML-PATH-PII-VERCEL-BEFORESEND: the Vercel `beforeSend` used to scrub
   * only `/u/<token>`, so an email or a uid in a path reached Vercel in the vendor's own
   * `url` while GA4 and our page views carried the redacted form. Both inline copies of the
   * rule are RUN here against the same paths, and each must equal normalisePath().
   */
  it("★★ the Vercel beforeSend and the GA4 block apply normalisePath's rules to the same cases", () => {
    const origin = "https://www.lazytopper.com";
    const paths = [
      "/",
      "/notes/electricity",
      "/notes/chemical-reactions-and-equations",
      "/notes/areas-related-to-circles/",
      "/admin/students/AbCdEfGhIjKlMnOpQrStUvWxYz12",
      "/admin/students/0123456789abcdef0123",
      "/parent/a@b.c",
      "/parent/a%40b.c/report",
      "/topic-hub/10/Maths",
      `/${"y".repeat(250)}`,
      "/pricing/",
      "/upload",
    ];
    for (const path of paths) {
      const expected = normalisePath(path);
      expect(beforeSendUrl(`${origin}${path}?oobCode=SECRET#frag`), `beforeSend ${path}`).toBe(origin + expected);
      expect(runGa4Block(`${origin}${path}`).config?.page_location, `GA4 ${path}`).toBe(origin + expected);
    }
    // The /u/ hand-off: beforeSend redacts it; the GA4 block never runs at all.
    const token = "e".repeat(64);
    expect(beforeSendUrl(`${origin}/u/${token}`)).toBe(`${origin}${normalisePath(`/u/${token}`)}`);
    expect(runGa4Block(`${origin}/u/${token}`).dataLayer).toBeUndefined();
    // CONTROL — the rule really fires (a no-op on both sides would also be "equal").
    expect(normalisePath("/admin/students/AbCdEfGhIjKlMnOpQrStUvWxYz12")).toBe("/admin/students/:id");
    expect(normalisePath("/parent/a@b.c")).toBe("/parent/:email");
  });
});

/**
 * LOW-END-1 (L2, owner ruling 3) — the GA4 LIBRARY loads late; the queue does not.
 *
 * The 175 KB gtag.js sat on every page's critical path (LOW-END-SCOUT-1 P3). The inline queue,
 * gtag() and the config still run at once — the landing address and gclid are captured
 * before anything else (pinned above). Only the script request waits: first interaction, or
 * window load + idle, and never later than 4 s after load.
 *
 * Mutations (LOW-END-1 section 5): drop the replay of pre-load events (empty the queue when
 * the library is requested) -> the stub-delivery test goes red; load the library immediately
 * -> the defer test goes red.
 */
describe("index.html — the GA4 library is deferred (LOW-END-1 L2)", () => {
  it("★ requests NOTHING while the page loads — the queue and config exist, the script does not", () => {
    const run = runGa4Block("https://www.lazytopper.com/?gclid=EARLY");
    expect(run.appended).toEqual([]);
    expect(run.gtagDefined).toBe(true);
    expect(run.config?.page_location).toBe("https://www.lazytopper.com/?gclid=EARLY");
    // Waiting on load, and on the first interaction — not on a timer started before load.
    expect(run.listeners()).toEqual(["keydown", "load", "pointerdown", "scroll", "touchstart"]);
    expect(run.timers).toEqual([]);
  });

  it("★ after window load: an idle callback (timeout 4 s) and a hard 4 s cap; whichever fires first loads it, ONCE", () => {
    const run = runGa4Block("https://www.lazytopper.com/");
    run.fire("load");
    expect(run.appended).toEqual([]);
    expect(run.idleTimeouts).toEqual([4000]);
    expect(run.timers).toEqual([4000]);
    run.runIdle();
    expect(run.appended).toEqual([{ tagName: "script", async: true, src: GTAG_SRC }]);
    run.runTimers();
    run.fire("pointerdown");
    expect(run.appended).toHaveLength(1);
    // The interaction listeners are gone once it has loaded.
    expect(run.listeners()).toEqual(["load"]);
  });

  it("the 4 s cap alone loads it when the main thread never goes idle (or there is no requestIdleCallback)", () => {
    const busy = runGa4Block("https://www.lazytopper.com/");
    busy.fire("load");
    busy.runTimers();
    expect(busy.appended).toHaveLength(1);
    const noIdle = runGa4Block("https://www.lazytopper.com/", { noIdle: true });
    noIdle.fire("load");
    expect(noIdle.timers).toEqual([4000]);
    noIdle.runTimers();
    expect(noIdle.appended).toHaveLength(1);
  });

  it.each(["pointerdown", "keydown", "touchstart", "scroll"])(
    "a first interaction (%s) before load requests it at once",
    (cue) => {
      const run = runGa4Block("https://www.lazytopper.com/");
      run.fire(cue);
      expect(run.appended).toEqual([{ tagName: "script", async: true, src: GTAG_SRC }]);
    },
  );

  it("a block that runs after load (readyState complete) schedules the idle load straight away", () => {
    const run = runGa4Block("https://www.lazytopper.com/", { readyState: "complete" });
    expect(run.idleTimeouts).toEqual([4000]);
    expect(run.timers).toEqual([4000]);
  });

  it("★★ STUB LIBRARY — every event pushed before the library loads is delivered to it after it loads, in order", () => {
    const run = runGa4Block("https://www.lazytopper.com/pricing?gclid=G7");
    const gtag = run.win.gtag as (...args: unknown[]) => void;
    // What src/analytics/ sends while the library is still absent: a page view, then sign_up.
    gtag("set", { page_location: "https://www.lazytopper.com/pricing" });
    gtag("event", "page_view", { page_location: "https://www.lazytopper.com/pricing" });
    gtag("event", "sign_up", { page_location: "https://www.lazytopper.com/pricing" });
    expect(run.appended).toEqual([]);

    run.fire("load");
    run.runIdle();
    expect(run.appended).toHaveLength(1);

    // The stub is what gtag.js does on arrival: process the queue it finds on window.dataLayer,
    // then take over push.
    const delivered: unknown[][] = [];
    const queue = run.win.dataLayer as Array<ArrayLike<unknown>>;
    for (const entry of queue) delivered.push(Array.from(entry));
    queue.push = (...entries: Array<ArrayLike<unknown>>) => {
      for (const entry of entries) delivered.push(Array.from(entry));
      return queue.length;
    };
    gtag("event", "after_load");

    expect(delivered.map((e) => (e[0] === "event" ? `event:${String(e[1])}` : String(e[0])))).toEqual([
      "js",
      "config",
      "set",
      "event:page_view",
      "event:sign_up",
      "event:after_load",
    ]);
    expect(delivered[1][2]).toMatchObject({ page_location: "https://www.lazytopper.com/pricing?gclid=G7" });
  });
});

/**
 * LOW-END-1 (L1, owner ruling 1) — ONE web font, self-hosted, for headings; body text is the
 * system font. Fonts were 136-295 KB per page from three families on a second origin, one of
 * them through a chained @import (LOW-END-SCOUT-1 P1, P2).
 *
 * Mutation (LOW-END-1 section 5, M6): re-add the Google Fonts <link> -> red here.
 */
describe("index.html + styles.css — fonts (LOW-END-1 L1)", () => {
  const styles = readFileSync(resolve(__dirname, "../styles.css"), "utf-8");
  const fontPath = "/fonts/fraunces-700-latin.woff2";

  it("★ no font request leaves this origin — no Google Fonts link, preconnect or @import anywhere", () => {
    for (const [name, text] of [["index.html", html], ["styles.css", styles]] as const) {
      expect(text, name).not.toMatch(/fonts\.googleapis\.com/);
      expect(text, name).not.toMatch(/fonts\.gstatic\.com/);
    }
    expect(styles).not.toMatch(/@import\s+url\(\s*["']?https?:/);
  });

  it("★ index.html preloads the self-hosted Fraunces woff2 (as=font, type, crossorigin), base-relative", () => {
    const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
    const preload = links.filter((l) => /rel="preload"/.test(l) && /as="font"/.test(l));
    expect(preload).toHaveLength(1);
    expect(preload[0]).toContain(`href="${fontPath}"`);
    expect(preload[0]).toContain('type="font/woff2"');
    expect(preload[0]).toMatch(/\scrossorigin(\s|=|\/|>)/);
    // CLAUDE.md section 7: no hard-coded retired-base prefix — the href starts at the root.
    expect(preload[0]).toMatch(/href="\/fonts\//);
  });

  it("★ styles.css declares Fraunces 700 from that same file with font-display: swap", () => {
    const faces = [...styles.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
    const fraunces = faces.filter((f) => /font-family:\s*["']Fraunces["']/.test(f));
    expect(fraunces).toHaveLength(1);
    expect(fraunces[0]).toMatch(/font-weight:\s*700/);
    expect(fraunces[0]).toMatch(/font-display:\s*swap/);
    expect(fraunces[0]).toContain(`url("${fontPath}") format("woff2")`);
    // Inter and Space Grotesk are not loaded in any form.
    for (const f of faces) expect(f).not.toMatch(/Inter|Space Grotesk/);
  });

  it("the font file and its OFL licence ship from public/fonts/", () => {
    const woff2 = readFileSync(resolve(__dirname, `../../public${fontPath}`));
    expect(woff2.subarray(0, 4).toString("latin1")).toBe("wOF2");
    expect(woff2.length).toBeLessThan(60 * 1024); // the scout's font budget
    const licence = readFileSync(resolve(__dirname, "../../public/fonts/Fraunces-OFL.txt"), "utf-8");
    expect(licence).toContain("SIL Open Font License, Version 1.1");
    expect(licence).toContain("Fraunces Project Authors");
  });

  it("★ body text is the system font: --font-body is exactly the ruled stack", () => {
    const m = styles.match(/--font-body:\s*([^;]+);/);
    expect(m).not.toBeNull();
    expect(m![1].trim()).toBe('system-ui, -apple-system, "Segoe UI", Roboto, sans-serif');
  });

  it("CONTROL — the Google Fonts detector fires on the link this lane removed", () => {
    const removed =
      '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />';
    expect(removed).toMatch(/fonts\.googleapis\.com/);
  });
});
